import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ListaPoliticos } from '../../componentes/ListaPoliticos';
import { politicos } from '../fixtures/politicos';

describe('ListaPoliticos', () => {
  it('renderiza um card por item', () => {
    const itens = politicos.slice(0, 3);
    render(<ListaPoliticos itens={itens} carregando={false} onSelecionar={vi.fn()} />);
    // Pelo nome, não por contagem de <button>: o card poderia ganhar botões internos.
    for (const p of itens) {
      expect(screen.getByText(p.nome)).toBeInTheDocument();
    }
    expect(screen.queryByText(/nenhum político encontrado/i)).toBeNull();
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
