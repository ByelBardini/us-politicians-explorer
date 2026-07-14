import { useQuery } from '@tanstack/react-query';
import { buscarFiltros } from '../api/politicos';

export function useFiltros() {
  return useQuery({ queryKey: ['filtros'], queryFn: buscarFiltros, staleTime: Infinity });
}
