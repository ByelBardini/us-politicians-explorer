import type { ErrorRequestHandler } from 'express';
import { z } from 'zod';

import type { Logger } from '../lib/logger.js';
import { HttpError } from './errors.js';

/**
 * Formato de erro único para toda a API: `{ error: { message, details? } }`.
 *
 * Registrado por ÚLTIMO no app (exigência do Express: middleware de erro tem 4
 * args e só é alcançado depois das rotas). No Express 5, throws síncronos e
 * rejeições de handlers `async` chegam aqui automaticamente.
 *
 * - `HttpError` → o status e a mensagem que ele carrega.
 * - `ZodError` → 400 (validação), com a árvore de erros em `details`.
 * - Qualquer outro → 500 genérico e logado; nunca vaza `stack`/detalhes internos.
 */
export const errorHandler =
  (logger: Logger): ErrorRequestHandler =>
  (err, _req, res, _next) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({
        error: { message: err.message, details: err.details },
      });
    }

    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: { message: 'Requisição inválida', details: z.treeifyError(err) },
      });
    }

    logger.error('Erro não tratado na API.', err);
    return res.status(500).json({ error: { message: 'Erro interno do servidor.' } });
  };
