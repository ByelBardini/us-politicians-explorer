import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PoliticoCard } from '../../componentes/PoliticoCard';
import { politicoCompleto, politicoSemFoto } from '../fixtures/politicos';

describe('PoliticoCard', () => {
  it('renderiza nome/estado/partido e dispara onSelecionar', async () => {
    const onSelecionar = vi.fn();
    render(<PoliticoCard politico={politicoCompleto} onSelecionar={onSelecionar} />);

    expect(screen.getByText(/aisha wahab/i)).toBeInTheDocument();
    expect(screen.getByText(/california/i)).toBeInTheDocument();
    expect(screen.getByText('Democratic')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button'));
    expect(onSelecionar).toHaveBeenCalledWith(politicoCompleto);
  });

  it('usa avatar com a inicial quando foto é null (sem <img>)', () => {
    const { container } = render(
      <PoliticoCard politico={politicoSemFoto} onSelecionar={vi.fn()} />,
    );

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText(politicoSemFoto.nome.charAt(0))).toBeInTheDocument();
  });
});
