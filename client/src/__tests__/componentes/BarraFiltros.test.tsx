import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { BarraFiltros } from '../../componentes/BarraFiltros';

describe('BarraFiltros', () => {
  it('emite onChange ao selecionar estado', async () => {
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
