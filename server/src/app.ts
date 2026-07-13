import express from 'express';

/**
 * Fábrica do app Express.
 *
 * Separa a *montagem* (rotas e middlewares, sem I/O) do *bootstrap* (porta,
 * relógio, banco), que fica no `index.ts`. É o que destrava os testes de rota:
 * o `supertest` recebe o app pronto, sem abrir porta nem tocar rede/banco.
 *
 * A assinatura ganha `deps` nas próximas tarefas (logger, CORS, repository...).
 */
export function createApp() {
  const app = express();

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
