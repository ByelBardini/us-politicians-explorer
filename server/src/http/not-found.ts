import type { RequestHandler } from 'express';

import { HttpError } from './errors.js';

/**
 * Fallback para rotas não mapeadas: encaminha um `HttpError` 404 ao error
 * handler, garantindo que o 404 saia no mesmo shape JSON `{ error }` de qualquer
 * outro erro (o 404 padrão do Express seria HTML). Registrado depois das rotas
 * e antes do `errorHandler`.
 */
export const notFound: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `Rota não encontrada: ${req.method} ${req.originalUrl}`));
};
