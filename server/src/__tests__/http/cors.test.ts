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
    });

    const res = await request(app).get('/health').set('Origin', 'http://localhost:8080');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:8080');
  });
});
