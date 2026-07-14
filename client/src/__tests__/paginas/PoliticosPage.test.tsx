import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { PoliticosPage } from '../../paginas/PoliticosPage';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PoliticosPage />
    </QueryClientProvider>,
  );
}

describe('PoliticosPage', () => {
  it('lista, filtra e abre o detalhe', async () => {
    renderPage();

    // Lista inicial (mock): Aisha Wahab (California) e Kirsten Engel (Arizona) na página 1.
    await waitFor(() => expect(screen.getByText(/aisha wahab/i)).toBeInTheDocument());
    expect(screen.getByText(/kirsten engel/i)).toBeInTheDocument();

    // Filtra por estado → some quem não é da California; Aisha permanece.
    await userEvent.selectOptions(await screen.findByLabelText(/estado/i), 'California');
    await waitFor(() => expect(screen.queryByText(/kirsten engel/i)).toBeNull());
    expect(screen.getByText(/aisha wahab/i)).toBeInTheDocument();

    // Clicar no card abre o drawer de detalhe.
    await userEvent.click(screen.getByText(/aisha wahab/i));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
