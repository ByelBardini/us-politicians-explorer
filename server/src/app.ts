import express from 'express';

import { errorHandler } from './http/error-handler.js';
import { notFound } from './http/not-found.js';
import type { Logger } from './lib/logger.js';

export interface AppDeps {
  logger: Logger;
}

/**
 * Fábrica do app Express.
 *
 * Separa a *montagem* (rotas e middlewares, sem I/O) do *bootstrap* (porta,
 * relógio, banco), que fica no `index.ts`. É o que destrava os testes de rota:
 * o `supertest` recebe o app pronto, sem abrir porta nem tocar rede/banco.
 *
 * `deps` cresce nas próximas tarefas (CORS, repository, syncService...).
 */
export function createApp(deps: AppDeps) {
  const app = express();

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Por último, sempre: o 404 fecha as rotas não mapeadas e o error handler
  // (4 args) só é alcançado depois de tudo. Inverter a ordem quebra ambos.
  app.use(notFound);
  app.use(errorHandler(deps.logger));

  return app;
}
