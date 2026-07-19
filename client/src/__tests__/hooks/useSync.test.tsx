import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useSync } from '../../hooks/useSync';
import { servidor, urlApi } from '../../teste/msw';

function criarWrapper() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('useSync', () => {
  it('dispara o POST /sync e expõe a resposta 202', async () => {
    servidor.use(
      http.post(urlApi('/sync'), () =>
        HttpResponse.json(
          { status: 'accepted', message: 'Sync iniciado em background.' },
          { status: 202 },
        ),
      ),
    );

    const { result } = renderHook(() => useSync(), { wrapper: criarWrapper() });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.message).toBe('Sync iniciado em background.');
  });

  it('expõe isError quando a API falha', async () => {
    servidor.use(
      http.post(urlApi('/sync'), () =>
        HttpResponse.json({ error: { message: 'Erro interno do servidor.' } }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useSync(), { wrapper: criarWrapper() });
    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Erro interno do servidor.');
  });
});
