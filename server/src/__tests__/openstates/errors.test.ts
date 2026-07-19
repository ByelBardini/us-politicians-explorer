import { describe, expect, it } from 'vitest';

import { OpenStatesHttpError, RateLimitExhaustedError } from '../../openstates/errors.js';

/**
 * O que importa aqui não é o construtor guardar argumentos, e sim:
 * 1. a cadeia de `instanceof` (protegida por `Object.setPrototypeOf`), da qual o
 *    SyncService depende para classificar erros (pular estado vs abortar ciclo);
 * 2. os campos (`status`, `attempts`) que o client lê para decidir retry;
 * 3. mensagens com contexto de depuração (status, url, tentativas).
 */
describe('OpenStatesHttpError', () => {
  const url = 'https://v3.openstates.org/people?jurisdiction=California&page=1';

  it('mantém instanceof através da cadeia e expõe os campos usados na classificação', () => {
    const erro = new OpenStatesHttpError(500, 'Internal Server Error', url, 'boom');

    expect(erro).toBeInstanceOf(Error);
    expect(erro).toBeInstanceOf(OpenStatesHttpError);
    expect(erro.name).toBe('OpenStatesHttpError');
    expect(erro.status).toBe(500);
    expect(erro.body).toBe('boom');
    expect(new OpenStatesHttpError(400, 'Bad Request', url).body).toBeUndefined();
  });

  it('mostra status e url na mensagem', () => {
    const erro = new OpenStatesHttpError(503, 'Service Unavailable', url);

    expect(erro.message).toContain('503');
    expect(erro.message).toContain(url);
  });
});

describe('RateLimitExhaustedError', () => {
  it('mantém instanceof e não se confunde com OpenStatesHttpError', () => {
    const erro = new RateLimitExhaustedError(3, 2000);

    expect(erro).toBeInstanceOf(Error);
    expect(erro).toBeInstanceOf(RateLimitExhaustedError);
    expect(erro).not.toBeInstanceOf(OpenStatesHttpError);
    expect(erro.name).toBe('RateLimitExhaustedError');
    expect(erro.attempts).toBe(3);
    expect(new RateLimitExhaustedError(1).lastRetryAfterMs).toBeUndefined();
  });

  it('mostra o número de tentativas na mensagem', () => {
    expect(new RateLimitExhaustedError(3).message).toContain('3');
  });
});
