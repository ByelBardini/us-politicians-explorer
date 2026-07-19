import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { BotaoSync } from '../../componentes/BotaoSync';
import { servidor, urlApi } from '../../teste/msw';

function renderBotao() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BotaoSync />
    </QueryClientProvider>,
  );
}

describe('BotaoSync', () => {
  it('dispara o POST /sync ao clicar e mostra a mensagem do 202', async () => {
    let chamadas = 0;
    servidor.use(
      http.post(urlApi('/sync'), () => {
        chamadas += 1;
        return HttpResponse.json(
          { status: 'accepted', message: 'Sync iniciado em background.' },
          { status: 202 },
        );
      }),
    );
    renderBotao();

    await userEvent.click(screen.getByRole('button', { name: /sincronizar/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/sync iniciado em background/i);
    expect(chamadas).toBe(1);
  });

  it('mostra a mensagem de erro quando o sync falha', async () => {
    servidor.use(
      http.post(urlApi('/sync'), () =>
        HttpResponse.json({ error: { message: 'Erro interno do servidor.' } }, { status: 500 }),
      ),
    );
    renderBotao();

    await userEvent.click(screen.getByRole('button', { name: /sincronizar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/erro interno do servidor/i);
  });
});
