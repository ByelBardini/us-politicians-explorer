import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Paginacao } from '../../componentes/Paginacao';
import type { Pagination } from '../../tipos/politico';

const pag = (page: number, totalPages: number): Pagination => ({
  page,
  perPage: 12,
  total: totalPages * 12,
  totalPages,
});

describe('Paginacao', () => {
  it('não renderiza nada quando há uma página ou menos', () => {
    const { container } = render(<Paginacao pagination={pag(1, 1)} onPage={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('desabilita "Anterior" na primeira página e avança com "Próxima"', async () => {
    const onPage = vi.fn();
    render(<Paginacao pagination={pag(1, 3)} onPage={onPage} />);
    expect(screen.getByRole('button', { name: /anterior/i })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /próxima/i }));
    expect(onPage).toHaveBeenCalledWith(2);
  });

  it('desabilita "Próxima" na última página', () => {
    render(<Paginacao pagination={pag(3, 3)} onPage={vi.fn()} />);
    expect(screen.getByRole('button', { name: /próxima/i })).toBeDisabled();
  });
});
