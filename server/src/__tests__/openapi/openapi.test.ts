import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../app.js';
import type { Logger } from '../../lib/logger.js';
import { openApiDocument } from '../../openapi/openapi.js';
import type { PoliticosRepository } from '../../politicos/politicos.repository.js';

const fakeLogger = (): Logger => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });
const fakeRepo = () => ({}) as unknown as PoliticosRepository;

const appDocs = () =>
  createApp({
    logger: fakeLogger(),
    corsOrigin: 'http://localhost:8080',
    repository: fakeRepo(),
    syncService: { run: vi.fn(async () => ({})) },
    openApiDocument,
  });

describe('openApiDocument', () => {
  it('é OpenAPI 3.1 e cobre os 3 endpoints', () => {
    expect(openApiDocument.openapi).toBe('3.1.0');
    expect(Object.keys(openApiDocument.paths ?? {})).toEqual(
      expect.arrayContaining(['/politicos', '/politicos/filtros', '/sync']),
    );
  });

  it('openapi.json versionado está em dia com o documento gerado', () => {
    // Os testes de contrato (aqui e no client) validam contra o arquivo em
    // disco; se ele divergir do código, validam contra um contrato velho.
    // Regenerar com `npm run openapi:generate`.
    const caminho = resolve(dirname(fileURLToPath(import.meta.url)), '../../../openapi.json');
    const emDisco = JSON.parse(readFileSync(caminho, 'utf8')) as unknown;

    expect(emDisco).toEqual(JSON.parse(JSON.stringify(openApiDocument)));
  });
});

describe('rotas de documentação', () => {
  it('GET /api/openapi.json serve o documento', async () => {
    const res = await request(appDocs()).get('/api/openapi.json');

    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.1.0');
  });

  it('GET /api/docs/ serve a Swagger UI', async () => {
    const res = await request(appDocs()).get('/api/docs/');

    expect(res.status).toBe(200);
    expect(res.text.toLowerCase()).toContain('swagger');
  });
});
