import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PoliticoCard } from '../../componentes/PoliticoCard';
import { POLITICOS_MOCK } from '../../api/mocks';

describe('PoliticoCard', () => {
  it('renderiza nome/estado/partido e dispara onSelecionar', async () => {
    const onSelecionar = vi.fn();
    render(<PoliticoCard politico={POLITICOS_MOCK[0]} onSelecionar={onSelecionar} />);

    expect(screen.getByText(/aisha wahab/i)).toBeInTheDocument();
    expect(screen.getByText(/california/i)).toBeInTheDocument();
    expect(screen.getByText('Democratic')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button'));
    expect(onSelecionar).toHaveBeenCalledWith(POLITICOS_MOCK[0]);
  });

  it('usa avatar com a inicial quando foto é null (sem <img>)', () => {
    const semFoto = POLITICOS_MOCK.find((p) => p.foto === null)!;
    const { container } = render(<PoliticoCard politico={semFoto} onSelecionar={vi.fn()} />);

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText(semFoto.nome.charAt(0))).toBeInTheDocument();
  });
});
