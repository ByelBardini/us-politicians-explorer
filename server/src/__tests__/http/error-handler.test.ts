import express, { type RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createApp } from '../../app.js';
import { errorHandler } from '../../http/error-handler.js';
import { HttpError } from '../../http/errors.js';
import { notFound } from '../../http/not-found.js';
import type { Logger } from '../../lib/logger.js';

const fakeLogger = (): Logger => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

/**
 * App mínimo com a rota que lança registrada ANTES do error handler — a única
 * ordem que o Express 5 aceita para o handler de erro (4 args) capturar o throw.
 */
function appComRota(handler: RequestHandler, logger: Logger = fakeLogger()) {
  const app = express();
  app.use(express.json());
  app.get('/boom', handler);
  app.use(notFound);
  app.use(errorHandler(logger));
  return app;
}

describe('errorHandler / notFound', () => {
  it('mapeia HttpError para o status e shape { error }', async () => {
    const app = appComRota(() => {
      throw new HttpError(418, 'chá');
    });

    const res = await request(app).get('/boom');

    expect(res.status).toBe(418);
    expect(res.body).toEqual({ error: { message: 'chá' } });
  });

  it('inclui details quando o HttpError os tem', async () => {
    const app = appComRota(() => {
      throw new HttpError(400, 'inválido', { campo: 'estado' });
    });

    const res = await request(app).get('/boom');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { message: 'inválido', details: { campo: 'estado' } } });
  });

  it('mapeia ZodError para 400 com details', async () => {
    const schema = z.object({ nome: z.string() });
    const app = appComRota(() => {
      schema.parse({});
    });

    const res = await request(app).get('/boom');

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Requisição inválida');
    expect(res.body.error.details).toBeDefined();
  });

  it('rota desconhecida responde 404 no shape padrão', async () => {
    const res = await request(createApp({ logger: fakeLogger() })).get('/nao-existe');

    expect(res.status).toBe(404);
    expect(res.body.error.message).toContain('/nao-existe');
  });

  it('erro não previsto vira 500 logado, sem vazar stack', async () => {
    const logger = fakeLogger();
    const app = appComRota(() => {
      throw new Error('surpresa interna');
    }, logger);

    const res = await request(app).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { message: 'Erro interno do servidor.' } });
    expect(res.body.error).not.toHaveProperty('stack');
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
