import { Prisma, type Politico, type PrismaClient } from '../generated/prisma/client.js';
import type { PoliticoUpsertPayload } from '../openstates/mapper.js';

/** Filtros da listagem; `page`/`perPage` já vêm normalizados (schema Zod). */
export interface FiltrosPolitico {
  estado?: string;
  partido?: string;
  q?: string;
  page: number;
  perPage: number;
}

/** Uma página de resultados + a contagem total (para o cálculo de páginas). */
export interface PaginaPoliticos {
  dados: Politico[];
  total: number;
}

/**
 * Persistência de `Politico`.
 *
 * O sync depende desta interface, nunca do Prisma: é o que mantém os testes do
 * `SyncService` sem banco e sem client gerado.
 */
export interface PoliticosRepository {
  upsertByOpenstatesId(payload: PoliticoUpsertPayload): Promise<void>;
  listarPoliticos(filtros: FiltrosPolitico): Promise<PaginaPoliticos>;
  listarFiltros(): Promise<{ estados: string[]; partidos: string[] }>;
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
/**
 * Fatia mínima do `PrismaClient` usada aqui. Para a leitura, reusamos as
 * assinaturas reais de `findMany`/`count` (indexadas do client) — são genéricas
 * e o hand-typing não as satisfaz; o teste passa um fake com `as unknown`.
 */
export interface PrismaLike {
  politico: {
    upsert(args: {
      where: { openstatesId: string };
      create: DadosPolitico;
      update: DadosPolitico;
    }): Promise<unknown>;
    findMany: PrismaClient['politico']['findMany'];
    count: PrismaClient['politico']['count'];
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

    /**
     * Lista paginada com filtros. O `where` só inclui o que foi informado; os
     * filtros batem nos índices que já existem (`@@index([estado])`,
     * `@@index([partido])`). Lista e contagem vão numa ida só (`Promise.all`);
     * `perPage` é limitado no schema Zod, então `take` nunca vira scan gigante.
     */
    async listarPoliticos({ estado, partido, q, page, perPage }) {
      const where: Prisma.PoliticoWhereInput = {
        ...(estado && { estado }),
        ...(partido && { partido }),
        ...(q && { nome: { contains: q, mode: 'insensitive' } }),
      };

      const [dados, total] = await Promise.all([
        prisma.politico.findMany({
          where,
          skip: (page - 1) * perPage,
          take: perPage,
          orderBy: [{ estado: 'asc' }, { nome: 'asc' }],
        }),
        prisma.politico.count({ where }),
      ]);

      return { dados, total };
    },

    /**
     * Valores distintos para os dropdowns do frontend. `partido` nulo é
     * descartado no banco (`not: null`) e por segurança no `.filter` final.
     */
    async listarFiltros() {
      const [estados, partidos] = await Promise.all([
        prisma.politico.findMany({
          distinct: ['estado'],
          select: { estado: true },
          orderBy: { estado: 'asc' },
        }),
        prisma.politico.findMany({
          where: { partido: { not: null } },
          distinct: ['partido'],
          select: { partido: true },
          orderBy: { partido: 'asc' },
        }),
      ]);

      return {
        estados: estados.map((r) => r.estado),
        partidos: partidos.map((r) => r.partido).filter((p): p is string => Boolean(p)),
      };
    },
  };
}
