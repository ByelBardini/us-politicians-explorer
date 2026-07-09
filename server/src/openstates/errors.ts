/**
 * Erros de domínio do client da OpenStates.
 *
 * A distinção entre os dois é o que o sync usa para decidir: `RateLimitExhaustedError`
 * é parada limpa (retoma no próximo ciclo), qualquer outro erro propaga.
 *
 * Nenhum deles carrega a API key: ela viaja no header `X-Api-Key`, nunca na URL.
 */

/** Resposta não-2xx que não seja 429. */
export class OpenStatesHttpError extends Error {
  constructor(
    readonly status: number,
    readonly statusText: string,
    readonly url: string,
    readonly body?: string,
  ) {
    super(`OpenStates respondeu ${status} ${statusText} em ${url}`);
    this.name = 'OpenStatesHttpError';
    Object.setPrototypeOf(this, OpenStatesHttpError.prototype);
  }
}

/** 429 persistente: as tentativas de retry acabaram. O sync para e retoma depois. */
export class RateLimitExhaustedError extends Error {
  constructor(
    readonly attempts: number,
    readonly lastRetryAfterMs?: number,
  ) {
    super(`Rate limit da OpenStates persistiu após ${attempts} tentativa(s)`);
    this.name = 'RateLimitExhaustedError';
    Object.setPrototypeOf(this, RateLimitExhaustedError.prototype);
  }
}
