import type { RequestHandler } from 'express';
import type { z } from 'zod';

import { HttpError } from './errors.js';

/**
 * Valida `req.query` contra o schema e guarda o resultado tipado em
 * `res.locals.query`. No Express 5, `req.query` é read-only (getter) — não dá
 * para reatribuir o parse; por isso `res.locals`. Query inválida vira
 * `HttpError(400)`, que o error handler central formata.
 */
export const validarQuery =
  (schema: z.ZodType): RequestHandler =>
  (req, res, next) => {
    const r = schema.safeParse(req.query);
    if (!r.success) {
      return next(new HttpError(400, 'Parâmetros inválidos.', r.error.issues));
    }
    res.locals.query = r.data;
    next();
  };
