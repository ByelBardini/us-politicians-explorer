import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ListaPoliticos } from '../../componentes/ListaPoliticos';
import { POLITICOS_MOCK } from '../../api/mocks';

describe('ListaPoliticos', () => {
  it('renderiza um card por item', () => {
    const itens = POLITICOS_MOCK.slice(0, 3);
    render(<ListaPoliticos itens={itens} carregando={false} onSelecionar={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('mostra o estado vazio quando não há itens', () => {
    render(<ListaPoliticos itens={[]} carregando={false} onSelecionar={vi.fn()} />);
    expect(screen.getByText(/nenhum político encontrado/i)).toBeInTheDocument();
  });

  it('mostra o estado de carregando (role status) enquanto carrega', () => {
    render(<ListaPoliticos itens={[]} carregando onSelecionar={vi.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
