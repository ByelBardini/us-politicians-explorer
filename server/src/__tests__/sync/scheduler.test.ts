import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import cronReal from 'node-cron';

import type { Logger } from '../../lib/logger.js';
import {
  CRON_PADRAO,
  runStartupSync,
  startSyncScheduler,
  type CronLike,
  type ScheduledTaskLike,
} from '../../sync/scheduler.js';

const CRON = '0 3 * * *';
const TIMEZONE = 'America/Sao_Paulo';

let cron: CronLike & { schedule: ReturnType<typeof vi.fn>; validate: ReturnType<typeof vi.fn> };
let tarefa: ScheduledTaskLike;
let runSync: Mock<() => Promise<unknown>>;
let logger: Logger;

/** O callback que o scheduler registrou no cron — para dispararmos "a hora". */
const callbackAgendado = (): (() => Promise<void>) =>
  cron.schedule.mock.calls[0]![1] as () => Promise<void>;

const agendar = (sobrescreve: Partial<Parameters<typeof startSyncScheduler>[0]> = {}) =>
  startSyncScheduler({
    cron,
    enabled: true,
    schedule: CRON,
    timezone: TIMEZONE,
    runSync,
    logger,
    ...sobrescreve,
  });

beforeEach(() => {
  tarefa = { stop: vi.fn(), destroy: vi.fn() };
  cron = {
    schedule: vi.fn().mockReturnValue(tarefa),
    validate: vi.fn().mockReturnValue(true),
  };
  runSync = vi.fn().mockResolvedValue({ upserted: 0 });
  logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
});

describe('startSyncScheduler', () => {
  it('não agenda nada e devolve null quando desabilitado', () => {
    // SYNC_SCHEDULE_ENABLED=false => só sync manual, sem gasto automático de cota.
    const resultado = agendar({ enabled: false });

    expect(resultado).toBeNull();
    expect(cron.schedule).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalled();
  });

  it('lança quando a expressão cron é inválida (falha rápida no boot)', () => {
    cron.validate.mockReturnValue(false);

    // Melhor quebrar no boot do que descobrir meses depois que o sync nunca rodou.
    expect(() => agendar({ schedule: 'todo dia as 3' })).toThrow(/cron/i);
    expect(cron.schedule).not.toHaveBeenCalled();
  });

  it('valida a expressão antes de agendar', () => {
    agendar();

    expect(cron.validate).toHaveBeenCalledWith(CRON);
  });

  it('agenda com noOverlap, timezone e nome', () => {
    const resultado = agendar();

    expect(cron.schedule).toHaveBeenCalledOnce();
    const [expressao, , opcoes] = cron.schedule.mock.calls[0]!;
    expect(expressao).toBe(CRON);
    // noOverlap: um sync longo não pode ser atropelado pelo próximo tick.
    expect(opcoes).toMatchObject({ noOverlap: true, timezone: TIMEZONE });
    expect(resultado).toBe(tarefa);
  });

  it('dispara o sync quando a hora agendada chega', async () => {
    agendar();

    await callbackAgendado()();

    expect(runSync).toHaveBeenCalledOnce();
  });

  it('loga e não rejeita quando o sync agendado falha', async () => {
    runSync.mockRejectedValueOnce(new Error('OpenStates fora do ar'));
    agendar();

    // Uma rejeição aqui viraria unhandled rejection e poderia derrubar o processo.
    await expect(callbackAgendado()()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('runStartupSync', () => {
  it('roda o sync uma vez quando habilitado', async () => {
    await runStartupSync({ enabled: true, runSync, logger });

    expect(runSync).toHaveBeenCalledOnce();
  });

  it('não faz nada quando desabilitado', async () => {
    // Default false: cada `docker compose up` em dev gastaria um sync inteiro.
    await runStartupSync({ enabled: false, runSync, logger });

    expect(runSync).not.toHaveBeenCalled();
  });

  it('loga e engole o erro, para o boot não morrer por causa do sync', async () => {
    runSync.mockRejectedValueOnce(new Error('cota esgotada'));

    await expect(runStartupSync({ enabled: true, runSync, logger })).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('expressão cron padrão', () => {
  it('é aceita pelo validate real do node-cron', () => {
    // Trava o default contra um typo que só apareceria em produção.
    expect(cronReal.validate(CRON_PADRAO)).toBe(true);
  });

  it('é a mesma do default de SYNC_CRON', () => {
    expect(CRON_PADRAO).toBe('0 3 * * *');
  });
});
