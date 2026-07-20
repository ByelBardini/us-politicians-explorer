import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DetalhePolitico } from '../../componentes/DetalhePolitico';
import { politicoCompleto } from '../fixtures/politicos';

describe('DetalhePolitico', () => {
  it('mostra contato e fecha no Esc', async () => {
    const onFechar = vi.fn();
    render(<DetalhePolitico politico={politicoCompleto} onFechar={onFechar} />);
    expect(screen.getByText(/916-651-4410/)).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(onFechar).toHaveBeenCalled();
  });

  it('fecha ao clicar no botão de fechar', async () => {
    const onFechar = vi.fn();
    render(<DetalhePolitico politico={politicoCompleto} onFechar={onFechar} />);
    await userEvent.click(screen.getByRole('button', { name: /fechar detalhe/i }));
    expect(onFechar).toHaveBeenCalled();
  });

  it('exibe o gênero traduzido, não o valor cru da API', () => {
    render(<DetalhePolitico politico={politicoCompleto} onFechar={vi.fn()} />);
    // A fixture traz genero: 'Female' — na tela vira "Feminino".
    expect(screen.getByText('Feminino')).toBeInTheDocument();
    expect(screen.queryByText('Female')).toBeNull();
  });

  it('não renderiza nada quando politico é null', () => {
    const { container } = render(<DetalhePolitico politico={null} onFechar={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
