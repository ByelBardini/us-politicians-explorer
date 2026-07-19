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

  it('renderiza a vizinhança da página atual com elipses', () => {
    render(<Paginacao pagination={pag(5, 20)} onPage={vi.fn()} />);

    for (const nome of ['1', '4', '5', '6', '20']) {
      expect(screen.getByRole('button', { name: nome })).toBeInTheDocument();
    }
    // Páginas fora da vizinhança ficam atrás das elipses.
    expect(screen.queryByRole('button', { name: '2' })).toBeNull();
    expect(screen.queryByRole('button', { name: '19' })).toBeNull();
    expect(screen.getAllByText('…')).toHaveLength(2);
  });

  it('navega ao clicar em um número de página', async () => {
    const onPage = vi.fn();
    render(<Paginacao pagination={pag(5, 20)} onPage={onPage} />);
    await userEvent.click(screen.getByRole('button', { name: '4' }));
    expect(onPage).toHaveBeenCalledWith(4);
  });

  it('marca a página atual com aria-current="page"', () => {
    render(<Paginacao pagination={pag(5, 20)} onPage={vi.fn()} />);
    expect(screen.getByRole('button', { name: '5' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: '4' })).not.toHaveAttribute('aria-current');
  });

  it('não renderiza elipse quando as páginas são contíguas', () => {
    render(<Paginacao pagination={pag(2, 3)} onPage={vi.fn()} />);
    expect(screen.queryByText('…')).toBeNull();
  });
});
