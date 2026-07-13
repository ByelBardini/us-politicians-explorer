import { createDocument } from 'zod-openapi';

import {
  erroSchema,
  filtrosResponseSchema,
  paginatedPoliticosSchema,
  politicosQuerySchema,
  syncAceitoSchema,
  syncBodySchema,
} from '../politicos/politicos.schema.js';

/**
 * Documento OpenAPI 3.1 gerado dos MESMOS schemas Zod que validam as requests
 * (T5). Contrato derivado da validação real — nunca desatualiza, sem segunda
 * fonte de verdade. `operationId` em toda operação.
 */
export const openApiDocument = createDocument({
  openapi: '3.1.0',
  info: {
    title: 'US Politicians Explorer API',
    version: '1.0.0',
    description:
      'Lista e filtra políticos dos EUA (cache da OpenStates) e dispara o sync.',
  },
  servers: [{ url: '/api' }],
  paths: {
    '/politicos': {
      get: {
        operationId: 'listarPoliticos',
        summary: 'Lista paginada com filtros',
        requestParams: { query: politicosQuerySchema },
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: paginatedPoliticosSchema } },
          },
          '400': {
            description: 'Parâmetros inválidos',
            content: { 'application/json': { schema: erroSchema } },
          },
        },
      },
    },
    '/politicos/filtros': {
      get: {
        operationId: 'listarFiltros',
        summary: 'Valores distintos para os filtros',
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: filtrosResponseSchema } },
          },
        },
      },
    },
    '/sync': {
      post: {
        operationId: 'dispararSync',
        summary: 'Dispara o sync (background)',
        requestBody: {
          content: { 'application/json': { schema: syncBodySchema } },
        },
        responses: {
          '202': {
            description: 'Aceito',
            content: { 'application/json': { schema: syncAceitoSchema } },
          },
        },
      },
    },
  },
});
