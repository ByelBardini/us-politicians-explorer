import { Router } from 'express';

import type { Logger } from '../lib/logger.js';
import { syncBodySchema } from '../politicos/politicos.schema.js';

export interface SyncRouterDeps {
  /** O `SyncService.run` já existente — com guard single-flight embutido. */
  syncService: { run(estados?: string[]): Promise<unknown> };
  logger: Logger;
}

/**
 * Disparo manual do sync. Responde `202 Accepted` na hora e roda em background:
 * o sync leva minutos, então bloquear a request daria timeout.
 */
export const criarSyncRouter = (deps: SyncRouterDeps): Router => {
  const router = Router();

  router.post('/', (req, res) => {
    // ZodError (body malformado) → 400 pelo error handler central.
    const { estados } = syncBodySchema.parse(req.body ?? {});

    // Fire-and-forget: sem `await`. O guard single-flight do SyncService dedup
    // chamadas concorrentes (cron + este endpoint). Erros do background são
    // logados aqui, nunca viram unhandled rejection.
    void deps.syncService.run(estados).catch((e) => deps.logger.error('Sync manual falhou.', e));

    res.status(202).json({ status: 'accepted', message: 'Sync iniciado em background.' });
  });

  return router;
};
