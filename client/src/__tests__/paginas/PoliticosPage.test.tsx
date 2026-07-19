import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { PoliticosPage } from '../../paginas/PoliticosPage';
import { servidor, urlApi } from '../../teste/msw';
import { filtros, paginaDe, politicos } from '../fixtures/politicos';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PoliticosPage />
    </QueryClientProvider>,
  );
}

/** Registra as opções dos dropdowns; sem isso a `BarraFiltros` não os renderiza. */
const servirFiltros = () =>
  servidor.use(http.get(urlApi('/politicos/filtros'), () => HttpResponse.json(filtros)));

/**
 * Handler que aplica os filtros de verdade e devolve a query string recebida, para
 * o teste afirmar **o que saiu na rede** — não só o que sumiu da tela. Um filtro
 * que o frontend esquecesse de enviar passaria despercebido no assert visual.
 */
function servirPoliticos() {
  const queries: URLSearchParams[] = [];
  servidor.use(
    http.get(urlApi('/politicos'), ({ request }) => {
      const params = new URL(request.url).searchParams;
      queries.push(params);
      const estado = params.get('estado');
      const q = params.get('q')?.toLowerCase();
      let itens = estado ? politicos.filter((p) => p.estado === estado) : politicos;
      if (q) itens = itens.filter((p) => p.nome.toLowerCase().includes(q));
      return HttpResponse.json(paginaDe(itens, { perPage: 12 }));
    }),
  );
  return { ultimaQuery: () => queries.at(-1) };
}

describe('PoliticosPage', () => {
  it('lista, filtra por estado (enviando o filtro na query) e abre o detalhe', async () => {
    servirFiltros();
    const { ultimaQuery } = servirPoliticos();
    renderPage();

    await waitFor(() => expect(screen.getByText(/aisha wahab/i)).toBeInTheDocument());
    expect(screen.getByText(/kirsten engel/i)).toBeInTheDocument();

    await userEvent.selectOptions(await screen.findByLabelText(/estado/i), 'California');

    await waitFor(() => expect(ultimaQuery()?.get('estado')).toBe('California'));
    // Trocar de filtro sempre volta para a página 1.
    expect(ultimaQuery()?.get('page')).toBe('1');
    await waitFor(() => expect(screen.queryByText(/kirsten engel/i)).toBeNull());
    expect(screen.getByText(/aisha wahab/i)).toBeInTheDocument();

    await userEvent.click(screen.getByText(/aisha wahab/i));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('envia a busca por nome na query string, com debounce', async () => {
    servirFiltros();
    const { ultimaQuery } = servirPoliticos();
    renderPage();

    await userEvent.type(await screen.findByLabelText(/buscar por nome/i), 'aisha');

    await waitFor(() => expect(ultimaQuery()?.get('q')).toBe('aisha'), { timeout: 2000 });
  });

  it('mostra o contador de resultados e o atualiza ao filtrar', async () => {
    servirFiltros();
    servirPoliticos();
    renderPage();

    // O número fica em um <span> separado; asserta o textContent do parágrafo.
    expect(await screen.findByText(/políticos encontrados/i)).toHaveTextContent(
      '4 políticos encontrados',
    );

    await userEvent.selectOptions(await screen.findByLabelText(/estado/i), 'California');

    expect(await screen.findByText(/político encontrado$/i)).toHaveTextContent(
      '1 político encontrado',
    );
  });

  it('"Limpar filtros" no estado vazio restaura a listagem', async () => {
    servirFiltros();
    const { ultimaQuery } = servirPoliticos();
    renderPage();

    await userEvent.type(await screen.findByLabelText(/buscar por nome/i), 'nome-que-não-existe');
    expect(await screen.findByText(/nenhum político encontrado/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /limpar filtros/i }));

    await waitFor(() => expect(screen.getByText(/aisha wahab/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/buscar por nome/i)).toHaveValue('');
    // waitFor: uma requisição atrasada da digitação ainda pode chegar após a lista voltar.
    await waitFor(() => expect(ultimaQuery()?.get('q')).toBeNull());
  });

  it('mostra o estado de erro quando a API responde 500', async () => {
    servirFiltros();
    servidor.use(
      http.get(urlApi('/politicos'), () =>
        HttpResponse.json({ error: { message: 'Erro interno do servidor.' } }, { status: 500 }),
      ),
    );
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível carregar/i);
  });

  it('mostra o estado vazio quando a API não devolve nenhum político', async () => {
    servirFiltros();
    servidor.use(http.get(urlApi('/politicos'), () => HttpResponse.json(paginaDe([]))));
    renderPage();

    expect(await screen.findByText(/nenhum político encontrado/i)).toBeInTheDocument();
  });
});
