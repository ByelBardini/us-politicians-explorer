import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useFiltros } from '../../hooks/useFiltros';
import { servidor, urlApi } from '../../teste/msw';
import { filtros } from '../fixtures/politicos';

function criarWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('useFiltros', () => {
  it('busca as opções dos dropdowns em /politicos/filtros', async () => {
    servidor.use(http.get(urlApi('/politicos/filtros'), () => HttpResponse.json(filtros)));

    const { result } = renderHook(() => useFiltros(), { wrapper: criarWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(filtros);
  });

  it('expõe isError quando a API falha', async () => {
    servidor.use(
      http.get(urlApi('/politicos/filtros'), () =>
        HttpResponse.json({ error: { message: 'Erro interno do servidor.' } }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useFiltros(), { wrapper: criarWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
