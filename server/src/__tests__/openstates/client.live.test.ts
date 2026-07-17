import { describe, expect, it } from 'vitest';
import { z } from 'zod';

/**
 * A âncora contra o apodrecimento das fixtures.
 *
 * O resto da suíte roda sobre respostas gravadas (`helpers/pessoas-reais.ts`),
 * porque bater na API real a cada `npm test` queimaria a cota de ~500 req/dia.
 * O risco desse arranjo é um só: a API muda, a fixture não, e a suíte segue verde
 * mentindo. Este teste mata esse risco por **1 requisição** (~0,2% da cota).
 *
 * Duas regras que o mantêm honesto:
 *
 * 1. **Afirma o formato, nunca o conteúdo.** "Aisha Wahab é senadora da California"
 *    é verdade até ela deixar o cargo — um teste assim quebraria sozinho, sem bug
 *    nenhum do nosso lado. O contrato, esse, não deveria mudar.
 * 2. **Opt-in.** Fora do `npm test` e fora do CI: `RUN_LIVE_API=1 npm run test:live`.
 */
const LIGADO = process.env.RUN_LIVE_API === '1';

// `||`, não `??`: a variável chega como string vazia quando não está no `.env`,
// e vazio aqui significa "use o default", não "a URL é ''".
const BASE_URL = process.env.OPENSTATES_BASE_URL || 'https://v3.openstates.org';
const PER_PAGE = 50;

/**
 * O contrato do qual as fixtures dependem. Tudo opcional menos `id`/`name`: é
 * JSON não validado vindo da rede, e o mapper tolera o resto ausente.
 *
 * `z.string()` sem `.nullable()` nos campos de texto é intencional — codifica a
 * descoberta que moldou o mapper: **a API não usa `null`**, ausência é `""`. Se
 * ela passar a mandar `null`, este teste quebra e o `emptyToNull` precisa virar
 * `emptyOrNullToNull`.
 */
const escritorioSchema = z.object({
  name: z.string().optional(),
  voice: z.string().optional(),
  fax: z.string().optional(),
  address: z.string().optional(),
  classification: z.string().optional(),
});

const pessoaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  party: z.string().optional(),
  current_role: z
    .object({
      title: z.string().optional(),
      org_classification: z.string().optional(),
      // Distrito não é só número: existem "At-Large", "Chittenden-6".
      district: z.union([z.string(), z.number()]).optional(),
    })
    .optional(),
  jurisdiction: z
    .object({ id: z.string(), name: z.string(), classification: z.string() })
    .optional(),
  image: z.string().optional(),
  offices: z.array(escritorioSchema).optional(),
});

const respostaSchema = z.object({
  results: z.array(pessoaSchema).min(1),
  pagination: z.object({
    per_page: z.number(),
    page: z.number(),
    max_page: z.number(),
    total_items: z.number(),
  }),
});

/** A ÚNICA requisição do arquivo. Espelha a URL que o `OpenStatesClient` monta. */
const buscarUmaPagina = async () => {
  const url = new URL('/people', BASE_URL);
  url.searchParams.set('jurisdiction', 'California');
  url.searchParams.set('per_page', String(PER_PAGE));
  url.searchParams.set('page', '1');
  url.searchParams.set('include', 'offices');

  const resposta = await fetch(url, {
    headers: {
      'X-Api-Key': process.env.OPENSTATES_API_KEY ?? '',
      Accept: 'application/json',
    },
  });

  expect(resposta.status, 'a chave da OpenStates é válida e há cota disponível').toBe(200);
  return respostaSchema.parse(await resposta.json());
};

describe.skipIf(!LIGADO)('OpenStates API ao vivo (1 requisição da cota)', () => {
  it('a resposta real ainda casa com o formato que as fixtures assumem', async () => {
    const corpo = await buscarUmaPagina();

    // As duas premissas de cota que sustentam o projeto inteiro:
    // `per_page=50` respeitado (se a API cortar para 10, o custo por sync sobe 5x)…
    expect(corpo.pagination.per_page).toBe(PER_PAGE);
    expect(corpo.results.length).toBeLessThanOrEqual(PER_PAGE);

    // …e `include=offices` ainda trazendo os escritórios. Sem isso a coluna
    // `contatos` ficaria null para todo mundo, em silêncio.
    expect(corpo.results.some((p) => (p.offices?.length ?? 0) > 0)).toBe(true);

    // O `parse` acima já validou o formato de cada pessoa; estes dois só tornam
    // explícito o que mais importa: a chave do upsert e o nome existem sempre.
    expect(corpo.results.every((p) => p.id.startsWith('ocd-person/'))).toBe(true);
    expect(corpo.results.every((p) => p.name.length > 0)).toBe(true);
  });
});
