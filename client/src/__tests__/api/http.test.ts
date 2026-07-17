import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError, apiGet } from '../../api/http';
import { servidor, urlApi } from '../../teste/msw';

/**
 * Testes sobre HTTP de verdade: o `fetch` roda, a URL é montada e o status chega.
 * Quem finge é só o servidor do outro lado (MSW).
 */
describe('apiGet', () => {
  it('devolve o JSON parseado quando o status é 200', async () => {
    servidor.use(http.get(urlApi('/politicos'), () => HttpResponse.json({ data: [], ok: true })));

    await expect(apiGet('/politicos')).resolves.toEqual({ data: [], ok: true });
  });

  it('serializa a query string e omite parâmetros undefined/null', async () => {
    let recebida: URLSearchParams | undefined;
    servidor.use(
      http.get(urlApi('/politicos'), ({ request }) => {
        recebida = new URL(request.url).searchParams;
        return HttpResponse.json({});
      }),
    );

    await apiGet('/politicos', {
      estado: 'California',
      partido: undefined,
      q: null,
      page: 2,
      perPage: 20,
    });

    expect(recebida?.get('estado')).toBe('California');
    expect(recebida?.get('page')).toBe('2');
    expect(recebida?.get('perPage')).toBe('20');
    // O ponto: `undefined` não pode virar o texto "undefined" na URL — isso faria
    // o backend filtrar por um partido chamado "undefined".
    expect(recebida?.has('partido')).toBe(false);
    expect(recebida?.has('q')).toBe(false);
  });

  it('lança ApiError com a mensagem do backend quando o status é 400', async () => {
    servidor.use(
      http.get(urlApi('/politicos'), () =>
        HttpResponse.json(
          { error: { message: 'Requisição inválida', details: { perPage: ['máx. 100'] } } },
          { status: 400 },
        ),
      ),
    );

    const erro = await apiGet('/politicos').catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).status).toBe(400);
    expect((erro as ApiError).message).toBe('Requisição inválida');
    expect((erro as ApiError).details).toEqual({ perPage: ['máx. 100'] });
  });

  it('lança ApiError sem estourar no .json() quando o 500 vem sem corpo JSON', async () => {
    servidor.use(
      http.get(urlApi('/politicos'), () => new HttpResponse('<html>proxy caiu</html>', { status: 500 })),
    );

    const erro = await apiGet('/politicos').catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).status).toBe(500);
    expect((erro as ApiError).message).toContain('500');
  });

  it('traduz falha de rede em ApiError, sem unhandled rejection', async () => {
    servidor.use(http.get(urlApi('/politicos'), () => HttpResponse.error()));

    const erro = await apiGet('/politicos').catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ApiError);
    // Não houve resposta: não existe status HTTP para reportar.
    expect((erro as ApiError).status).toBe(0);
  });
});
