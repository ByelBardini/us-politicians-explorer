import { apiGet } from './http';
import type { Filtros, ListarParams, PaginatedPoliticos } from '../tipos/politico';

/**
 * Endpoints de políticos. As assinaturas são as mesmas de quando a camada era
 * mockada — por isso nenhum hook, componente ou página mudou ao ligar a API real.
 */

export function listarPoliticos(params: ListarParams = {}): Promise<PaginatedPoliticos> {
  const { estado, partido, q, page, perPage } = params;
  return apiGet<PaginatedPoliticos>('/politicos', { estado, partido, q, page, perPage });
}

/**
 * Endpoint dedicado: o backend deriva as opções com `distinct`, então os dropdowns
 * conhecem todos os estados/partidos — não só os da página atual.
 */
export function buscarFiltros(): Promise<Filtros> {
  return apiGet<Filtros>('/politicos/filtros');
}
