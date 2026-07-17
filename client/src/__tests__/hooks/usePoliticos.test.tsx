import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { usePoliticos } from '../../hooks/usePoliticos';
import { servidor, urlApi } from '../../teste/msw';
import { paginaDe, politicoCompleto, politicoSemFoto } from '../fixtures/politicos';

function criarWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('usePoliticos', () => {
  it('busca a lista por HTTP e envia os filtros na query string', async () => {
    let recebida: URLSearchParams | undefined;
    servidor.use(
      http.get(urlApi('/politicos'), ({ request }) => {
        recebida = new URL(request.url).searchParams;
        return HttpResponse.json(paginaDe([politicoCompleto]));
      }),
    );

    const { result } = renderHook(() => usePoliticos({ estado: 'California', page: 1 }), {
      wrapper: criarWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.pagination.total).toBe(1);
    expect(recebida?.get('estado')).toBe('California');
  });

  it('expõe isError com a mensagem do backend quando a API responde 500', async () => {
    servidor.use(
      http.get(urlApi('/politicos'), () =>
        HttpResponse.json({ error: { message: 'Erro interno do servidor.' } }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => usePoliticos({}), { wrapper: criarWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Erro interno do servidor.');
  });

  it('mantém os dados da página anterior enquanto a próxima carrega (keepPreviousData)', async () => {
    servidor.use(
      http.get(urlApi('/politicos'), ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page'));
        const item = page === 1 ? politicoCompleto : politicoSemFoto;
        return HttpResponse.json(paginaDe([item], { page, perPage: 1, total: 2, totalPages: 2 }));
      }),
    );

    const wrapper = criarWrapper();
    const { result, rerender } = renderHook(({ page }) => usePoliticos({ page, perPage: 1 }), {
      wrapper,
      initialProps: { page: 1 },
    });

    await waitFor(() => expect(result.current.data?.data[0]?.nome).toBe(politicoCompleto.nome));

    rerender({ page: 2 });

    // O ponto: durante a requisição da página 2, `data` ainda é a página 1 — a
    // lista não pisca para vazio. Comportamento que o mock nunca exercitou.
    expect(result.current.data?.data[0]?.nome).toBe(politicoCompleto.nome);
    expect(result.current.isPlaceholderData).toBe(true);

    await waitFor(() => expect(result.current.data?.data[0]?.nome).toBe(politicoSemFoto.nome));
    expect(result.current.isPlaceholderData).toBe(false);
  });
});
