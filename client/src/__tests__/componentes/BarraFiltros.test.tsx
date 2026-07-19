import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { BarraFiltros } from '../../componentes/BarraFiltros';
import type { ValorFiltros } from '../../componentes/BarraFiltros';
import { servidor, urlApi } from '../../teste/msw';
import { filtros } from '../fixtures/politicos';

// Único I/O do componente: as opções dos dropdowns vêm do `/politicos/filtros`.
const servirFiltros = () =>
  servidor.use(http.get(urlApi('/politicos/filtros'), () => HttpResponse.json(filtros)));

function renderBarra(props: { valor?: ValorFiltros; total?: number } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BarraFiltros
        valor={props.valor ?? { estado: '', partido: '', q: '' }}
        onChange={vi.fn()}
        total={props.total}
      />
    </QueryClientProvider>,
  );
}

describe('BarraFiltros', () => {
  it('emite onChange ao selecionar estado', async () => {
    servirFiltros();
    const onChange = vi.fn();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <BarraFiltros valor={{ estado: '', partido: '', q: '' }} onChange={onChange} />
      </QueryClientProvider>,
    );
    await userEvent.selectOptions(await screen.findByLabelText(/estado/i), 'California');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ estado: 'California' }));
  });

  it('emite onChange ao selecionar partido, preservando os demais filtros', async () => {
    servirFiltros();
    const onChange = vi.fn();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <BarraFiltros valor={{ estado: 'California', partido: '', q: 'aisha' }} onChange={onChange} />
      </QueryClientProvider>,
    );
    await userEvent.selectOptions(await screen.findByLabelText(/partido/i), 'Democratic');
    expect(onChange).toHaveBeenCalledWith({ estado: 'California', partido: 'Democratic', q: 'aisha' });
  });

  it('não renderiza os dropdowns enquanto /filtros não responde', async () => {
    servidor.use(
      http.get(urlApi('/politicos/filtros'), () =>
        HttpResponse.json({ error: { message: 'Erro interno do servidor.' } }, { status: 500 }),
      ),
    );
    renderBarra({ total: 3 });

    // O contador independe do fetch — âncora de que o componente montou.
    expect(await screen.findByText(/políticos encontrados/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/estado/i)).toBeNull();
    expect(screen.queryByLabelText(/partido/i)).toBeNull();
  });

  it('flexiona o contador no singular e no plural', async () => {
    servirFiltros();
    const { unmount } = renderBarra({ total: 1 });
    expect(await screen.findByText(/político encontrado$/i)).toHaveTextContent(
      '1 político encontrado',
    );
    unmount();

    servirFiltros();
    renderBarra({ total: 0 });
    expect(await screen.findByText(/políticos encontrados/i)).toHaveTextContent(
      '0 políticos encontrados',
    );
  });
});
