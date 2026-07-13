import { Router } from 'express';

import { validarQuery } from '../http/validate.js';
import { toPoliticoDTO } from './politicos.dto.js';
import type { PoliticosRepository } from './politicos.repository.js';
import { politicosQuerySchema, type PoliticosQuery } from './politicos.schema.js';

export interface PoliticosRouterDeps {
  repository: PoliticosRepository;
}

/**
 * Rotas de `/api/politicos`. O handler recebe a query já validada e tipada
 * (via `res.locals.query`), então trabalha com dados confiáveis; `totalPages` é
 * calculado no servidor; o DTO desacopla o modelo do banco do contrato público.
 */
export const criarPoliticosRouter = (deps: PoliticosRouterDeps): Router => {
  const router = Router();

  router.get('/', validarQuery(politicosQuerySchema), async (_req, res) => {
    const { estado, partido, q, page, perPage } = res.locals.query as PoliticosQuery;

    const { dados, total } = await deps.repository.listarPoliticos({
      estado,
      partido,
      q,
      page,
      perPage,
    });

    res.json({
      data: dados.map(toPoliticoDTO),
      pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
    });
  });

  // Endpoint dedicado: evita o frontend puxar todos os registros só para derivar
  // as opções dos dropdowns. Sem colisão com `/:id` (não existe rota assim).
  router.get('/filtros', async (_req, res) => {
    res.json(await deps.repository.listarFiltros());
  });

  return router;
};
