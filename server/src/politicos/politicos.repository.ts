import { Prisma } from '../generated/prisma/client.js';
import type { PoliticoUpsertPayload } from '../openstates/mapper.js';

/**
 * Persistência de `Politico`.
 *
 * O sync depende desta interface, nunca do Prisma: é o que mantém os testes do
 * `SyncService` sem banco e sem client gerado.
 */
export interface PoliticosRepository {
  upsertByOpenstatesId(payload: PoliticoUpsertPayload): Promise<void>;
}

/**
 * O payload do mapper, já traduzido para o que o Prisma aceita.
 *
 * Numa coluna `Json?`, o Prisma **rejeita `null` puro**: exige o sentinel
 * `Prisma.DbNull` (SQL NULL) ou `Prisma.JsonNull` (o literal JSON `null`).
 * Traduzir aqui — e não no mapper — mantém o mapper puro e testável, e deixa a
 * peculiaridade do Prisma confinada ao adaptador que fala com o Prisma.
 */
type DadosPolitico = Omit<PoliticoUpsertPayload, 'contatos' | 'raw'> & {
  contatos: Prisma.InputJsonValue | typeof Prisma.DbNull;
  raw: Prisma.InputJsonValue;
};

/**
 * Fatia mínima do `PrismaClient` usada aqui. O client real a satisfaz
 * estruturalmente (verificado no typecheck), então o `index.ts` passa o Prisma
 * direto — e o teste passa um fake, sem subir banco.
 */
export interface PrismaLike {
  politico: {
    upsert(args: {
      where: { openstatesId: string };
      create: DadosPolitico;
      update: DadosPolitico;
    }): Promise<unknown>;
  };
}

/** `OpenStatesOffice[]` é JSON puro; ausência vira SQL NULL. */
const paraJson = (payload: PoliticoUpsertPayload): DadosPolitico => ({
  ...payload,
  contatos: payload.contatos
    ? (payload.contatos as unknown as Prisma.InputJsonValue)
    : Prisma.DbNull,
  raw: payload.raw as unknown as Prisma.InputJsonValue,
});

export function createPoliticosRepository(prisma: PrismaLike): PoliticosRepository {
  return {
    /**
     * Upsert pelo `openstatesId` — a chave natural da API, não o `id` do banco.
     * É o que torna o sync idempotente: rodar duas vezes atualiza, não duplica.
     * `create` e `update` levam o mesmo payload, para o re-sync sobrescrever os
     * dados antigos com os frescos.
     */
    async upsertByOpenstatesId(payload) {
      const dados = paraJson(payload);

      await prisma.politico.upsert({
        where: { openstatesId: payload.openstatesId },
        create: dados,
        update: dados,
      });
    },
  };
}
