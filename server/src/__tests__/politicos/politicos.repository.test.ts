import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Prisma } from '../../generated/prisma/client.js';
import { mapPersonToPolitico } from '../../openstates/mapper.js';
import {
  createPoliticosRepository,
  type PrismaLike,
} from '../../politicos/politicos.repository.js';
import {
  senadoraCompleta,
  viceGovernadoraSemDistrito,
} from '../openstates/helpers/pessoas-reais.js';

/** Payloads reais, vindos do mapper — não objetos inventados à parte. */
const comContatos = mapPersonToPolitico(senadoraCompleta, 'California');
const semContatos = mapPersonToPolitico(viceGovernadoraSemDistrito, 'California');

let upsert: ReturnType<typeof vi.fn>;
let prisma: PrismaLike;

/** Os argumentos com que o prisma.politico.upsert foi chamado. */
const argsDoUpsert = () =>
  upsert.mock.calls[0]![0] as {
    where: Record<string, unknown>;
    create: Record<string, unknown>;
    update: Record<string, unknown>;
  };

beforeEach(() => {
  upsert = vi.fn().mockResolvedValue({});
  // Fake do seam PrismaLike: o teste não sobe banco.
  prisma = { politico: { upsert } } as unknown as PrismaLike;
});

describe('createPoliticosRepository.upsertByOpenstatesId', () => {
  it('faz o upsert pelo openstatesId, não pelo id do banco', async () => {
    // A chave do cache é o id da OpenStates: é o que torna o sync idempotente.
    await createPoliticosRepository(prisma).upsertByOpenstatesId(comContatos);

    expect(upsert).toHaveBeenCalledOnce();
    expect(argsDoUpsert().where).toEqual({
      openstatesId: 'ocd-person/295965df-6c71-4e11-806f-2b7d5be5d45c',
    });
    expect(argsDoUpsert().where).not.toHaveProperty('id');
  });

  it('grava os campos do payload', async () => {
    await createPoliticosRepository(prisma).upsertByOpenstatesId(comContatos);

    expect(argsDoUpsert().create).toMatchObject({
      nome: 'Aisha Wahab',
      estado: 'California',
      partido: 'Democratic',
      cargo: 'Senator',
      distrito: '10',
    });
  });

  it('usa o mesmo objeto em create e update, para o re-sync sobrescrever os dados', async () => {
    await createPoliticosRepository(prisma).upsertByOpenstatesId(comContatos);

    expect(argsDoUpsert().create).toEqual(argsDoUpsert().update);
  });

  describe('colunas Json', () => {
    it('repassa os offices como contatos quando existem', async () => {
      await createPoliticosRepository(prisma).upsertByOpenstatesId(comContatos);

      expect(argsDoUpsert().create.contatos).toEqual(senadoraCompleta.offices);
    });

    // O Prisma REJEITA `null` puro numa coluna Json?: exige o sentinel DbNull.
    // Sem esta tradução, todo político sem escritório quebraria a escrita.
    it('traduz contatos ausente para Prisma.DbNull, não para null', async () => {
      expect(semContatos.contatos).toBeNull();

      await createPoliticosRepository(prisma).upsertByOpenstatesId(semContatos);

      expect(argsDoUpsert().create.contatos).toBe(Prisma.DbNull);
      expect(argsDoUpsert().create.contatos).not.toBeNull();
    });

    it('sempre envia o raw, que nunca é nulo', async () => {
      await createPoliticosRepository(prisma).upsertByOpenstatesId(semContatos);

      expect(argsDoUpsert().create.raw).toEqual(viceGovernadoraSemDistrito);
    });
  });

  it('resolve void em caso de sucesso', async () => {
    await expect(
      createPoliticosRepository(prisma).upsertByOpenstatesId(comContatos),
    ).resolves.toBeUndefined();
  });

  it('propaga a rejeição do prisma, para o sync não relatar sucesso falso', async () => {
    upsert.mockRejectedValueOnce(new Error('conexão perdida'));

    await expect(
      createPoliticosRepository(prisma).upsertByOpenstatesId(comContatos),
    ).rejects.toThrow('conexão perdida');
  });
});

describe('createPoliticosRepository — leitura', () => {
  /** Fake do seam de leitura: registra os args e devolve dados canned. */
  const fakeLeitura = (opts: { findMany?: unknown; count?: number } = {}) => {
    const findMany = vi.fn().mockResolvedValue(opts.findMany ?? []);
    const count = vi.fn().mockResolvedValue(opts.count ?? 0);
    const prismaLeitura = { politico: { findMany, count } } as unknown as PrismaLike;
    return { prismaLeitura, findMany, count };
  };

  describe('listarPoliticos', () => {
    it('monta where/skip/take a partir dos filtros', async () => {
      const { prismaLeitura, findMany, count } = fakeLeitura({
        findMany: [{ id: '1', nome: 'Ana' }],
        count: 42,
      });
      const repo = createPoliticosRepository(prismaLeitura);

      const r = await repo.listarPoliticos({
        estado: 'California',
        q: 'Ana',
        page: 2,
        perPage: 20,
      });

      const args = findMany.mock.calls[0]![0];
      expect(args.where).toMatchObject({
        estado: 'California',
        nome: { contains: 'Ana', mode: 'insensitive' },
      });
      expect(args).toMatchObject({ skip: 20, take: 20 }); // (page-1)*perPage
      // A contagem usa o mesmo where da busca.
      expect(count.mock.calls[0]![0].where).toMatchObject({ estado: 'California' });
      expect(r.total).toBe(42);
      expect(r.dados).toEqual([{ id: '1', nome: 'Ana' }]);
    });

    it('omite do where os filtros ausentes', async () => {
      const { prismaLeitura, findMany } = fakeLeitura();
      const repo = createPoliticosRepository(prismaLeitura);

      await repo.listarPoliticos({ page: 1, perPage: 20 });

      expect(findMany.mock.calls[0]![0].where).toEqual({});
    });

    it('filtra por partido quando informado', async () => {
      const { prismaLeitura, findMany } = fakeLeitura();
      const repo = createPoliticosRepository(prismaLeitura);

      await repo.listarPoliticos({ partido: 'Democratic', page: 1, perPage: 20 });

      expect(findMany.mock.calls[0]![0].where).toEqual({ partido: 'Democratic' });
    });
  });

  describe('listarFiltros', () => {
    it('retorna estados/partidos distintos, ordenados, sem nulos', async () => {
      const findMany = vi
        .fn()
        .mockResolvedValueOnce([{ estado: 'California' }, { estado: 'Texas' }])
        .mockResolvedValueOnce([{ partido: 'Democratic' }, { partido: 'Republican' }]);
      const prismaLeitura = { politico: { findMany } } as unknown as PrismaLike;
      const repo = createPoliticosRepository(prismaLeitura);

      const r = await repo.listarFiltros();

      expect(r).toEqual({
        estados: ['California', 'Texas'],
        partidos: ['Democratic', 'Republican'],
      });
      // A query de partidos descarta os nulos e usa distinct.
      const argsPartidos = findMany.mock.calls[1]![0];
      expect(argsPartidos.where).toEqual({ partido: { not: null } });
      expect(argsPartidos.distinct).toEqual(['partido']);
    });
  });
});
