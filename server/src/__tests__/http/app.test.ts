import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../app.js';
import type { Logger } from '../../lib/logger.js';
import type { PoliticosRepository } from '../../politicos/politicos.repository.js';

const fakeLogger = (): Logger => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });
const fakeRepo = () => ({}) as unknown as PoliticosRepository;

describe('createApp', () => {
  it('GET /health responde 200 { status: "ok" }', async () => {
    const res = await request(
      createApp({
        logger: fakeLogger(),
        corsOrigin: 'http://localhost:8080',
        repository: fakeRepo(),
        syncService: { run: vi.fn(async () => ({})) },
        openApiDocument: {},
      }),
    ).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
