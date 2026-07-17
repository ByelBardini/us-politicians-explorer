import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { servidor, urlApi } from '../teste/msw';
import { filtros, paginaDe } from './fixtures/politicos';

describe('App', () => {
  it('renderiza o título', () => {
    // A página busca dados assim que monta; sem handlers o MSW falha a requisição
    // (`onUnhandledRequest: 'error'`), que é a trava funcionando como projetada.
    servidor.use(
      http.get(urlApi('/politicos'), () => HttpResponse.json(paginaDe([]))),
      http.get(urlApi('/politicos/filtros'), () => HttpResponse.json(filtros)),
    );
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <App />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('heading', { name: /us politicians explorer/i })).toBeInTheDocument();
  });
});
