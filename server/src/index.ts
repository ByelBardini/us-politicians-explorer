import nodeCron from 'node-cron';

import { createApp } from './app.js';
import { parseEnv } from './config/env.js';
import { consoleLogger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { sleep } from './lib/sleep.js';
import { OpenStatesClient } from './openstates/client.js';
import { createPoliticosRepository } from './politicos/politicos.repository.js';
import { runStartupSync, startSyncScheduler } from './sync/scheduler.js';
import { SyncService } from './sync/sync.service.js';

/**
 * Bootstrap: é aqui — e só aqui — que as implementações concretas se encontram.
 * Todo o resto depende de interfaces, o que mantém os testes sem rede e sem banco.
 *
 * As variáveis de ambiente chegam prontas em `process.env`: no Docker o compose
 * as injeta; em dev, o script `npm run dev` carrega os `.env` via flag do Node.
 * Por isso nada de `dotenv` no runtime.
 */

// Falha rápida: sem OPENSTATES_API_KEY ou DATABASE_URL, o servidor nem sobe.
const env = parseEnv();

const openStates = new OpenStatesClient({
  apiKey: env.OPENSTATES_API_KEY,
  baseUrl: env.OPENSTATES_BASE_URL,
  perPage: env.SYNC_PER_PAGE,
  requestDelayMs: env.SYNC_REQUEST_DELAY_MS,
  fetch,
  sleep,
  logger: consoleLogger,
});

const repository = createPoliticosRepository(prisma);

const syncService = new SyncService({
  client: openStates,
  repository,
  states: env.SYNC_STATES,
  logger: consoleLogger,
});

const app = createApp({
  logger: consoleLogger,
  corsOrigin: env.CORS_ORIGIN,
  repository,
});

// POST /api/sync entra na Tarefa 8.

// Antes do listen, de propósito: um SYNC_CRON inválido lança aqui, e o processo
// morre sem nunca abrir a porta. Se isto rodasse dentro do callback do listen,
// um orquestrador veria a porta subir e só então cair.
startSyncScheduler({
  cron: nodeCron,
  enabled: env.SYNC_SCHEDULE_ENABLED,
  schedule: env.SYNC_CRON,
  timezone: env.SYNC_CRON_TIMEZONE,
  runSync: () => syncService.run(),
  logger: consoleLogger,
});

app.listen(env.BACKEND_PORT, () => {
  consoleLogger.info(`Servidor ouvindo em http://localhost:${env.BACKEND_PORT}`);

  // Sem `await`: o sync leva minutos, e o servidor já está no ar servindo o que
  // houver em cache. Os erros são logados dentro da própria função.
  void runStartupSync({
    enabled: env.SYNC_ON_STARTUP,
    runSync: () => syncService.run(),
    logger: consoleLogger,
  });
});
