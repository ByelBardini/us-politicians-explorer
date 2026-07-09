import { describe, expect, it } from 'vitest';

import { OpenStatesHttpError, RateLimitExhaustedError } from '../../openstates/errors.js';

describe('OpenStatesHttpError', () => {
  const url = 'https://v3.openstates.org/people?jurisdiction=California&page=1';

  it('carrega status, statusText, url e body', () => {
    const erro = new OpenStatesHttpError(500, 'Internal Server Error', url, 'boom');

    expect(erro.status).toBe(500);
    expect(erro.statusText).toBe('Internal Server Error');
    expect(erro.url).toBe(url);
    expect(erro.body).toBe('boom');
  });

  it('define name e é instanceof Error', () => {
    const erro = new OpenStatesHttpError(404, 'Not Found', url);

    expect(erro.name).toBe('OpenStatesHttpError');
    expect(erro).toBeInstanceOf(Error);
    expect(erro).toBeInstanceOf(OpenStatesHttpError);
  });

  it('mostra status e url na mensagem', () => {
    const erro = new OpenStatesHttpError(503, 'Service Unavailable', url);

    expect(erro.message).toContain('503');
    expect(erro.message).toContain(url);
  });

  it('body é opcional', () => {
    expect(new OpenStatesHttpError(400, 'Bad Request', url).body).toBeUndefined();
  });

  it('pode ser capturado por tipo', () => {
    expect(() => {
      throw new OpenStatesHttpError(500, 'Internal Server Error', url);
    }).toThrow(OpenStatesHttpError);
  });
});

describe('RateLimitExhaustedError', () => {
  it('carrega attempts e lastRetryAfterMs', () => {
    const erro = new RateLimitExhaustedError(3, 2000);

    expect(erro.attempts).toBe(3);
    expect(erro.lastRetryAfterMs).toBe(2000);
  });

  it('define name e é instanceof Error', () => {
    const erro = new RateLimitExhaustedError(3);

    expect(erro.name).toBe('RateLimitExhaustedError');
    expect(erro).toBeInstanceOf(Error);
    expect(erro).toBeInstanceOf(RateLimitExhaustedError);
  });

  it('mostra o número de tentativas na mensagem', () => {
    expect(new RateLimitExhaustedError(3).message).toContain('3');
  });

  it('lastRetryAfterMs é opcional', () => {
    expect(new RateLimitExhaustedError(1).lastRetryAfterMs).toBeUndefined();
  });

  it('pode ser capturado por tipo, e não confunde com OpenStatesHttpError', () => {
    expect(() => {
      throw new RateLimitExhaustedError(3);
    }).toThrow(RateLimitExhaustedError);

    expect(new RateLimitExhaustedError(3)).not.toBeInstanceOf(OpenStatesHttpError);
  });
});
