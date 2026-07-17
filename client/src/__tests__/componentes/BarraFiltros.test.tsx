import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { BarraFiltros } from '../../componentes/BarraFiltros';
import { servidor, urlApi } from '../../teste/msw';
import { filtros } from '../fixtures/politicos';

describe('BarraFiltros', () => {
  it('emite onChange ao selecionar estado', async () => {
    // Único I/O do componente: as opções dos dropdowns vêm do `/politicos/filtros`.
    servidor.use(http.get(urlApi('/politicos/filtros'), () => HttpResponse.json(filtros)));
    const onChange = vi.fn();
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <BarraFiltros valor={{ estado: '', partido: '', q: '' }} onChange={onChange} />
      </QueryClientProvider>,
    );
    await userEvent.selectOptions(await screen.findByLabelText(/estado/i), 'California');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ estado: 'California' }));
  });
});
