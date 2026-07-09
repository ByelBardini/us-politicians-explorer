import { afterEach, describe, expect, it, vi } from 'vitest';

import { EnvValidationError, parseEnv } from '../../config/env.js';

/** Fonte completa e válida. Cada teste parte daqui e altera só o que investiga. */
const fonteValida: Record<string, string> = {
  OPENSTATES_API_KEY: 'chave-secreta',
  OPENSTATES_BASE_URL: 'https://v3.openstates.org',
  DATABASE_URL: 'postgresql://politics:politics@localhost:5434/politics?schema=public',
  BACKEND_PORT: '3000',
  CORS_ORIGIN: 'http://localhost:8080',
  SYNC_STATES: 'California,New York',
  SYNC_PER_PAGE: '50',
  SYNC_REQUEST_DELAY_MS: '1100',
  SYNC_SCHEDULE_ENABLED: 'true',
  SYNC_CRON: '0 3 * * *',
  SYNC_CRON_TIMEZONE: 'America/Sao_Paulo',
  SYNC_ON_STARTUP: 'false',
};

/** Só o que é obrigatório — o resto deve vir de default. */
const somenteObrigatorias = {
  OPENSTATES_API_KEY: 'chave-secreta',
  DATABASE_URL: 'postgresql://politics:politics@localhost:5434/politics?schema=public',
};

const semAsChaves = (...chaves: string[]): Record<string, string> => {
  const copia = { ...fonteValida };
  for (const chave of chaves) delete copia[chave];
  return copia;
};

describe('parseEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('converte uma fonte válida em Env tipado', () => {
    expect(parseEnv(fonteValida)).toEqual({
      OPENSTATES_API_KEY: 'chave-secreta',
      OPENSTATES_BASE_URL: 'https://v3.openstates.org',
      DATABASE_URL: 'postgresql://politics:politics@localhost:5434/politics?schema=public',
      BACKEND_PORT: 3000,
      CORS_ORIGIN: 'http://localhost:8080',
      SYNC_STATES: ['California', 'New York'],
      SYNC_PER_PAGE: 50,
      SYNC_REQUEST_DELAY_MS: 1100,
      SYNC_SCHEDULE_ENABLED: true,
      SYNC_CRON: '0 3 * * *',
      SYNC_CRON_TIMEZONE: 'America/Sao_Paulo',
      SYNC_ON_STARTUP: false,
    });
  });

  it('lança EnvValidationError quando OPENSTATES_API_KEY falta', () => {
    expect(() => parseEnv(semAsChaves('OPENSTATES_API_KEY'))).toThrow(EnvValidationError);
    expect(() => parseEnv(semAsChaves('OPENSTATES_API_KEY'))).toThrow(/OPENSTATES_API_KEY/);
  });

  it('lança EnvValidationError quando DATABASE_URL falta', () => {
    expect(() => parseEnv(semAsChaves('DATABASE_URL'))).toThrow(EnvValidationError);
    expect(() => parseEnv(semAsChaves('DATABASE_URL'))).toThrow(/DATABASE_URL/);
  });

  it('aplica os defaults quando só as obrigatórias estão presentes', () => {
    const env = parseEnv(somenteObrigatorias);

    expect(env.OPENSTATES_BASE_URL).toBe('https://v3.openstates.org');
    expect(env.BACKEND_PORT).toBe(3000);
    expect(env.CORS_ORIGIN).toBe('http://localhost:8080');
    expect(env.SYNC_STATES).toEqual([]);
    expect(env.SYNC_PER_PAGE).toBe(50);
    expect(env.SYNC_REQUEST_DELAY_MS).toBe(1100);
    expect(env.SYNC_CRON).toBe('0 3 * * *');
    expect(env.SYNC_CRON_TIMEZONE).toBe('America/Sao_Paulo');
    // Sync automático e de boot são opt-in: um `up` em dev não pode queimar a cota.
    expect(env.SYNC_SCHEDULE_ENABLED).toBe(false);
    expect(env.SYNC_ON_STARTUP).toBe(false);
  });

  it('coage SYNC_PER_PAGE e SYNC_REQUEST_DELAY_MS de string para number', () => {
    const env = parseEnv({ ...fonteValida, SYNC_PER_PAGE: '10', SYNC_REQUEST_DELAY_MS: '400' });

    expect(env.SYNC_PER_PAGE).toBe(10);
    expect(env.SYNC_REQUEST_DELAY_MS).toBe(400);
  });

  it('rejeita SYNC_PER_PAGE não numérico', () => {
    expect(() => parseEnv({ ...fonteValida, SYNC_PER_PAGE: 'cinquenta' })).toThrow(
      EnvValidationError,
    );
  });

  it('rejeita SYNC_PER_PAGE zero ou negativo', () => {
    expect(() => parseEnv({ ...fonteValida, SYNC_PER_PAGE: '0' })).toThrow(EnvValidationError);
    expect(() => parseEnv({ ...fonteValida, SYNC_PER_PAGE: '-1' })).toThrow(EnvValidationError);
  });

  it('rejeita OPENSTATES_BASE_URL que não é uma URL', () => {
    expect(() => parseEnv({ ...fonteValida, OPENSTATES_BASE_URL: 'nao-e-url' })).toThrow(
      EnvValidationError,
    );
  });

  describe('booleanos', () => {
    it.each([
      ['true', true],
      ['1', true],
      ['yes', true],
      ['false', false],
      ['0', false],
      ['no', false],
    ])('parseia SYNC_ON_STARTUP=%s como %s', (bruto, esperado) => {
      expect(parseEnv({ ...fonteValida, SYNC_ON_STARTUP: bruto }).SYNC_ON_STARTUP).toBe(esperado);
    });

    // z.coerce.boolean() diria `true` para qualquer string não-vazia, inclusive "false".
    it('não trata uma string arbitrária como booleano', () => {
      expect(() => parseEnv({ ...fonteValida, SYNC_ON_STARTUP: 'sim-por-favor' })).toThrow(
        EnvValidationError,
      );
    });
  });

  describe('SYNC_STATES', () => {
    it('divide em itens trimados e descarta os vazios', () => {
      const env = parseEnv({ ...fonteValida, SYNC_STATES: 'California, New York , ,Texas' });

      expect(env.SYNC_STATES).toEqual(['California', 'New York', 'Texas']);
    });

    it('devolve [] quando vazio (= todos os estados)', () => {
      expect(parseEnv({ ...fonteValida, SYNC_STATES: '' }).SYNC_STATES).toEqual([]);
    });

    it('devolve [] quando ausente', () => {
      expect(parseEnv(semAsChaves('SYNC_STATES')).SYNC_STATES).toEqual([]);
    });
  });

  it('trata string vazia como ausente e aplica o default', () => {
    // docker-compose injeta `VAR=` quando a variável está vazia no .env.
    const env = parseEnv({ ...fonteValida, SYNC_PER_PAGE: '', SYNC_CRON: '' });

    expect(env.SYNC_PER_PAGE).toBe(50);
    expect(env.SYNC_CRON).toBe('0 3 * * *');
  });

  it('exige as obrigatórias mesmo quando presentes porém vazias', () => {
    expect(() => parseEnv({ ...fonteValida, OPENSTATES_API_KEY: '' })).toThrow(EnvValidationError);
  });

  it('agrega todos os campos inválidos numa mensagem só', () => {
    let mensagem = '';
    try {
      parseEnv({ SYNC_PER_PAGE: 'abc' });
    } catch (erro) {
      mensagem = (erro as Error).message;
    }

    expect(mensagem).toMatch(/OPENSTATES_API_KEY/);
    expect(mensagem).toMatch(/DATABASE_URL/);
    expect(mensagem).toMatch(/SYNC_PER_PAGE/);
  });

  it('ignora variáveis desconhecidas (POSTGRES_*, etc.)', () => {
    const env = parseEnv({ ...fonteValida, POSTGRES_USER: 'politics' });

    expect(env).not.toHaveProperty('POSTGRES_USER');
  });

  it('lê apenas a fonte recebida, nunca process.env', () => {
    vi.stubEnv('OPENSTATES_API_KEY', 'vazando-do-process-env');

    expect(() => parseEnv(semAsChaves('OPENSTATES_API_KEY'))).toThrow(EnvValidationError);
  });

  it('usa process.env como fonte padrão quando nenhuma é passada', () => {
    for (const [chave, valor] of Object.entries(fonteValida)) vi.stubEnv(chave, valor);

    expect(parseEnv().OPENSTATES_API_KEY).toBe('chave-secreta');
  });
});
