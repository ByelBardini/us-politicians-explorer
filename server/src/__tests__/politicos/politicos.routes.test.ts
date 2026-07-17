import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../app.js';
import type { PoliticosRepository } from '../../politicos/politicos.repository.js';

/**
 * Só o que NÃO toca o banco: a validação da query pelo Zod, que acontece antes
 * de qualquer I/O. O comportamento com dados — filtro, paginação, DTO, contrato —
 * vive em `politicos.routes.integration.test.ts`, contra Postgres real, porque um
 * repository falso devolveria dados prontos e o SQL nunca rodaria.
 */
const repositoryNuncaChamado = {
  upsertByOpenstatesId: vi.fn(),
  listarPoliticos: vi.fn(),
  listarFiltros: vi.fn(),
} as unknown as PoliticosRepository;

const app = () =>
  createApp({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    corsOrigin: 'http://localhost:8080',
    repository: repositoryNuncaChamado,
    syncService: { run: vi.fn(async () => ({})) },
    openApiDocument: {},
  });

describe('GET /api/politicos — validação da query', () => {
  it('responde 400 quando perPage passa do teto', async () => {
    const res = await request(app()).get('/api/politicos?perPage=999');

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBeDefined();
    // A rota rejeita antes de consultar: uma query inválida não chega ao banco.
    expect(repositoryNuncaChamado.listarPoliticos).not.toHaveBeenCalled();
  });

  it('responde 400 quando page não é um inteiro positivo', async () => {
    const res = await request(app()).get('/api/politicos?page=0');

    expect(res.status).toBe(400);
    expect(repositoryNuncaChamado.listarPoliticos).not.toHaveBeenCalled();
  });

  it('responde 400 quando page não é numérico', async () => {
    const res = await request(app()).get('/api/politicos?page=abc');

    expect(res.status).toBe(400);
    expect(repositoryNuncaChamado.listarPoliticos).not.toHaveBeenCalled();
  });
});
