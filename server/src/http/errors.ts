/**
 * Erro de domínio HTTP: carrega o status e detalhes opcionais até o error
 * handler central, que o traduz no shape `{ error: { message, details? } }`.
 *
 * Handlers e middlewares lançam `HttpError`; só o `error-handler` conhece a
 * resposta. Mantém os handlers limpos e a formatação de erro num lugar só.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}
