import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../app.js';
import type { Politico } from '../../generated/prisma/client.js';
import type { Logger } from '../../lib/logger.js';
import type { PoliticosRepository } from '../../politicos/politicos.repository.js';

const fakeLogger = (): Logger => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

/** Uma linha completa do modelo Politico, como o Prisma devolve (datas Date, raw presente). */
const umPolitico: Politico = {
  id: 'cuid-1',
  openstatesId: 'ocd-person/abc',
  nome: 'Ana Silva',
  primeiroNome: 'Ana',
  sobrenome: 'Silva',
  cargo: 'Senator',
  camara: 'upper',
  distrito: '10',
  estado: 'California',
  partido: 'Democratic',
  foto: 'https://exemplo/foto.jpg',
  email: 'ana@exemplo.gov',
  genero: 'female',
  nascimento: new Date('1970-01-02T00:00:00.000Z'),
  falecimento: null,
  openstatesUrl: 'https://openstates.org/ana',
  contatos: [{ classification: 'capitol' }] as unknown as Politico['contatos'],
  raw: { tudo: 'aqui' } as unknown as Politico['raw'],
  criadoEm: new Date('2024-01-01T00:00:00.000Z'),
  atualizadoEm: new Date('2024-06-01T00:00:00.000Z'),
};

const fakeRepo = (over: Partial<Record<'listarPoliticos' | 'listarFiltros', unknown>> = {}) => {
  const listarPoliticos = vi
    .fn()
    .mockResolvedValue(over.listarPoliticos ?? { dados: [], total: 0 });
  const listarFiltros = vi
    .fn()
    .mockResolvedValue(over.listarFiltros ?? { estados: [], partidos: [] });
  const repository = {
    upsertByOpenstatesId: vi.fn(),
    listarPoliticos,
    listarFiltros,
  } as unknown as PoliticosRepository;
  return { repository, listarPoliticos, listarFiltros };
};

const appCom = (repository: PoliticosRepository) =>
  createApp({ logger: fakeLogger(), corsOrigin: 'http://localhost:8080', repository });

describe('GET /api/politicos', () => {
  it('devolve o envelope { data, pagination }', async () => {
    const { repository, listarPoliticos } = fakeRepo({
      listarPoliticos: { dados: [umPolitico], total: 1 },
    });

    const res = await request(appCom(repository)).get(
      '/api/politicos?estado=California&page=1&perPage=20',
    );

    expect(res.status).toBe(200);
    expect(res.body.pagination).toEqual({ page: 1, perPage: 20, total: 1, totalPages: 1 });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).not.toHaveProperty('raw'); // DTO não vaza o bruto
    expect(res.body.data[0].nome).toBe('Ana Silva');
    expect(listarPoliticos.mock.calls[0]![0]).toMatchObject({
      estado: 'California',
      page: 1,
      perPage: 20,
    });
  });

  it('calcula totalPages a partir de total/perPage', async () => {
    const { repository } = fakeRepo({ listarPoliticos: { dados: [], total: 45 } });

    const res = await request(appCom(repository)).get('/api/politicos?perPage=20');

    expect(res.body.pagination).toMatchObject({ total: 45, perPage: 20, totalPages: 3 });
  });

  it('responde 400 quando perPage passa do teto', async () => {
    const { repository } = fakeRepo();

    const res = await request(appCom(repository)).get('/api/politicos?perPage=999');

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBeDefined();
  });
});

describe('GET /api/politicos/filtros', () => {
  it('devolve { estados, partidos }', async () => {
    const { repository, listarFiltros } = fakeRepo({
      listarFiltros: { estados: ['California', 'Texas'], partidos: ['Democratic', 'Republican'] },
    });

    const res = await request(appCom(repository)).get('/api/politicos/filtros');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      estados: ['California', 'Texas'],
      partidos: ['Democratic', 'Republican'],
    });
    expect(listarFiltros).toHaveBeenCalledOnce();
  });
});
