import type { OpenStatesOffice, OpenStatesPerson } from './types.js';

/**
 * Tradução OpenStates -> modelo `Politico`. Função pura, sem dependências.
 *
 * O ponto central é que **a API não usa `null`: ausência é string vazia** —
 * verificado numa resposta real (50 legisladores da California): `death_date`
 * veio `""` em 50/50, `birth_date` em 13/50, e `district`/`image`/`email`/
 * `gender` em 1/50. Gravar `""` como se fosse valor encheria o banco de lixo,
 * e `new Date("")` viraria `Invalid Date` na escrita.
 */

/** Espelha as colunas de `Politico` no Prisma, sem importar os tipos gerados. */
export interface PoliticoUpsertPayload {
  openstatesId: string;
  nome: string;
  primeiroNome: string | null;
  sobrenome: string | null;
  cargo: string | null;
  camara: string | null;
  distrito: string | null;
  estado: string;
  partido: string | null;
  foto: string | null;
  email: string | null;
  genero: string | null;
  nascimento: Date | null;
  falecimento: Date | null;
  openstatesUrl: string | null;
  contatos: OpenStatesOffice[] | null;
  raw: OpenStatesPerson;
}

const vazioParaNull = (valor: string | null | undefined): string | null => {
  const limpo = valor?.trim();
  return limpo ? limpo : null;
};

/** `""` e datas malformadas viram `null` — nunca um `Invalid Date`. */
const paraData = (valor: string | null | undefined): Date | null => {
  const limpo = vazioParaNull(valor);
  if (limpo === null) return null;

  const data = new Date(limpo);
  return Number.isNaN(data.getTime()) ? null : data;
};

/**
 * Distrito é `string | number` no contrato. `String(0)` é `"0"`, e o teste do
 * `== null` (em vez de falsy) garante que o distrito zero não vire ausência.
 */
const paraDistrito = (valor: string | number | null | undefined): string | null => {
  if (valor === null || valor === undefined) return null;
  return vazioParaNull(String(valor));
};

export function mapPersonToPolitico(
  person: OpenStatesPerson,
  estadoDaBusca: string,
): PoliticoUpsertPayload {
  const cargoAtual = person.current_role;

  return {
    openstatesId: person.id,
    nome: person.name,
    primeiroNome: vazioParaNull(person.given_name),
    sobrenome: vazioParaNull(person.family_name),

    cargo: vazioParaNull(cargoAtual?.title),
    camara: vazioParaNull(cargoAtual?.org_classification),
    distrito: paraDistrito(cargoAtual?.district),

    // A busca é por estado, então o fallback é sempre o estado certo.
    estado: vazioParaNull(person.jurisdiction?.name) ?? estadoDaBusca,
    partido: vazioParaNull(person.party),

    foto: vazioParaNull(person.image),
    email: vazioParaNull(person.email),
    genero: vazioParaNull(person.gender),

    nascimento: paraData(person.birth_date),
    // Sem isto, um político morto apareceria como se estivesse no cargo.
    falecimento: paraData(person.death_date),

    openstatesUrl: vazioParaNull(person.openstates_url),
    contatos: person.offices?.length ? person.offices : null,
    // Payload completo: permite backfill de campos novos sem gastar cota de novo.
    raw: person,
  };
}
