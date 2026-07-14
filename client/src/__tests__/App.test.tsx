import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import App from '../App';

describe('App', () => {
  it('renderiza o título', () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <App />
      </QueryClientProvider>,
    );
    expect(
      screen.getByRole('heading', { name: /us politicians explorer/i }),
    ).toBeInTheDocument();
  });
});
