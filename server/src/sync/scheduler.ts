import type { Logger } from '../lib/logger.js';

/**
 * Agendamento do sync diário (node-cron v4).
 *
 * O `cron` entra por injeção para o teste afirmar *como* a tarefa é registrada
 * (expressão, timezone, `noOverlap`) sem esperar um tique real do relógio.
 */

/** Default de `SYNC_CRON`. Exportado para o teste validá-lo contra o cron real. */
export const CRON_PADRAO = '0 3 * * *';

export interface ScheduledTaskLike {
  stop(): unknown;
  destroy(): unknown;
}

/** Fatia da API do node-cron v4 que usamos. */
export interface CronLike {
  validate(expressao: string): boolean;
  schedule(
    expressao: string,
    tarefa: () => void | Promise<void>,
    opcoes: { name?: string; timezone?: string; noOverlap?: boolean },
  ): ScheduledTaskLike;
}

export interface SchedulerDeps {
  cron: CronLike;
  enabled: boolean;
  schedule: string;
  timezone: string;
  runSync: () => Promise<unknown>;
  logger: Logger;
}

/**
 * Registra o sync diário. Devolve `null` quando desabilitado.
 *
 * Na v4 do node-cron a tarefa **começa a valer assim que é criada** (as opções
 * `scheduled`/`runOnInit` sumiram), então só chamamos `schedule` quando o sync
 * automático está de fato ligado.
 */
export function startSyncScheduler(deps: SchedulerDeps): ScheduledTaskLike | null {
  if (!deps.enabled) {
    deps.logger.info('Sync automático desligado (SYNC_SCHEDULE_ENABLED=false).');
    return null;
  }

  // Falha rápida: uma expressão inválida agendaria nada, e só se descobriria
  // meses depois, ao notar que o cache nunca atualizou.
  if (!deps.cron.validate(deps.schedule)) {
    throw new Error(`SYNC_CRON inválido: "${deps.schedule}" não é uma expressão cron válida.`);
  }

  const tarefa = deps.cron.schedule(
    deps.schedule,
    async () => {
      // Engole o erro: uma rejeição aqui viraria unhandled rejection e poderia
      // derrubar o processo. O próximo tique tenta de novo.
      await deps.runSync().catch((erro: unknown) => {
        deps.logger.error('Sync agendado falhou.', erro);
      });
    },
    {
      name: 'sync-diario',
      timezone: deps.timezone,
      // Um sync pode passar de uma hora; sem isto, o próximo tique o atropelaria
      // e dobraria o consumo de cota.
      noOverlap: true,
    },
  );

  deps.logger.info(`Sync automático agendado: "${deps.schedule}" (${deps.timezone}).`);
  return tarefa;
}

/**
 * Sync no boot — opt-in. Com `SYNC_ON_STARTUP=true`, cada `docker compose up`
 * em desenvolvimento gastaria a cota de um sync inteiro; por isso o default é
 * `false`.
 */
export async function runStartupSync(deps: {
  enabled: boolean;
  runSync: () => Promise<unknown>;
  logger: Logger;
}): Promise<void> {
  if (!deps.enabled) return;

  deps.logger.info('Disparando o sync de boot (SYNC_ON_STARTUP=true)...');

  // O boot não pode morrer por causa do sync: sem cache o servidor ainda sobe,
  // serve o que já está no banco e aceita um POST /api/sync depois.
  await deps.runSync().catch((erro: unknown) => {
    deps.logger.error('Sync de boot falhou.', erro);
  });
}
