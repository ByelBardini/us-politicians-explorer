import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { errorHandler } from '../../http/error-handler.js';
import { validarQuery } from '../../http/validate.js';
import type { Logger } from '../../lib/logger.js';

const fakeLogger = (): Logger => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

const schema = z.object({ page: z.coerce.number().int().min(1).default(1) });

/** App mínimo: a rota ecoa o que o validarQuery gravou em res.locals.query. */
function appComValidacao() {
  const app = express();
  app.get('/', validarQuery(schema), (_req, res) => {
    res.json(res.locals.query);
  });
  app.use(errorHandler(fakeLogger()));
  return app;
}

describe('validarQuery', () => {
  it('grava o parse em res.locals.query e segue', async () => {
    const res = await request(appComValidacao()).get('/?page=3');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ page: 3 });
  });

  it('aplica defaults quando a query é omitida', async () => {
    const res = await request(appComValidacao()).get('/');

    expect(res.body).toEqual({ page: 1 });
  });

  it('responde 400 no shape de erro quando inválido', async () => {
    const res = await request(appComValidacao()).get('/?page=0');

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBeDefined();
    expect(res.body.error.details).toBeDefined();
  });
});
