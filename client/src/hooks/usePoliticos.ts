import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { listarPoliticos } from '../api/politicos';
import type { ListarParams } from '../tipos/politico';

export function usePoliticos(params: ListarParams) {
  return useQuery({
    queryKey: ['politicos', params],
    queryFn: () => listarPoliticos(params),
    placeholderData: keepPreviousData, // troca de filtro/página sem piscar p/ vazio
  });
}
