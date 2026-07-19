import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../app.js';
import type { Logger } from '../../lib/logger.js';
import type { PoliticosRepository } from '../../politicos/politicos.repository.js';

const fakeLogger = (): Logger => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });
const fakeRepo = () => ({}) as unknown as PoliticosRepository;

describe('CORS', () => {
  it('reflete o Origin permitido no header CORS', async () => {
    const app = createApp({
      logger: fakeLogger(),
      corsOrigin: 'http://localhost:8080',
      repository: fakeRepo(),
      syncService: { run: vi.fn(async () => ({})) },
      openApiDocument: {},
    });

    const res = await request(app).get('/health').set('Origin', 'http://localhost:8080');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:8080');
  });

  it('não reflete um Origin não permitido', async () => {
    const app = createApp({
      logger: fakeLogger(),
      corsOrigin: 'http://localhost:8080',
      repository: fakeRepo(),
      syncService: { run: vi.fn(async () => ({})) },
      openApiDocument: {},
    });

    const res = await request(app).get('/health').set('Origin', 'https://malicioso.example');

    // Com `origin` string, o pacote cors emite o header fixo com a origem
    // configurada — o navegador bloqueia pelo mismatch. O que não pode
    // acontecer é refletir a origem do request (`origin: true` / `*`), uma
    // regressão que o teste do caminho feliz acima não pegaria.
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:8080');
    expect(res.status).toBe(200);
  });
});
