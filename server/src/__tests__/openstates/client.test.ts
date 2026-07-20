import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Logger } from '../../lib/logger.js';
import { OpenStatesClient } from '../../openstates/client.js';
import { OpenStatesHttpError, RateLimitExhaustedError } from '../../openstates/errors.js';

import {
  capturarErro,
  erroHttp,
  jurisdicao,
  paginaDeJurisdicoes,
  paginaDePessoas,
  pessoa,
  tooManyRequests,
  urlDaChamada,
} from './helpers/respostas.js';

const API_KEY = 'chave-secreta';
const BASE_URL = 'https://v3.openstates.org';
const PER_PAGE = 50;
const DELAY_MS = 6100;

let fetchMock: ReturnType<typeof vi.fn>;
let sleepMock: ReturnType<typeof vi.fn>;
let logger: Logger;

const criarClient = (maxRetries?: number) =>
  new OpenStatesClient({
    apiKey: API_KEY,
    baseUrl: BASE_URL,
    perPage: PER_PAGE,
    requestDelayMs: DELAY_MS,
    fetch: fetchMock as unknown as typeof fetch,
    sleep: sleepMock as unknown as (ms: number) => Promise<void>,
    logger,
    ...(maxRetries === undefined ? {} : { maxRetries }),
  });

beforeEach(() => {
  fetchMock = vi.fn();
  // `sleep` injetado: o throttle é verificado pelo contrato (valor e nº de chamadas),
  // sem esperar tempo real nem coreografar fake timers com as microtasks do fetch.
  sleepMock = vi.fn().mockResolvedValue(undefined);
  logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
});

describe('fetchPeopleByJurisdiction', () => {
  it('envia o header X-Api-Key', async () => {
    fetchMock.mockResolvedValueOnce(paginaDePessoas({ results: [], page: 1, maxPage: 1 }));

    await criarClient().fetchPeopleByJurisdiction('California');

    const [, init] = fetchMock.mock.calls[0]!;
    expect(new Headers(init.headers).get('X-Api-Key')).toBe(API_KEY);
  });

  it('monta a query com jurisdiction, per_page, page e include=offices', async () => {
    fetchMock.mockResolvedValueOnce(paginaDePessoas({ results: [], page: 1, maxPage: 1 }));

    await criarClient().fetchPeopleByJurisdiction('New York');

    const url = urlDaChamada(fetchMock.mock.calls[0]![0]);
    expect(url.origin + url.pathname).toBe(`${BASE_URL}/people`);
    expect(url.searchParams.get('jurisdiction')).toBe('New York');
    expect(url.searchParams.get('per_page')).toBe('50');
    expect(url.searchParams.get('page')).toBe('1');
    // Sem include=offices a API omite `offices` e `contatos` ficaria null para sempre.
    expect(url.searchParams.getAll('include')).toContain('offices');
  });

  it('nunca coloca a api key na URL', async () => {
    fetchMock.mockResolvedValueOnce(paginaDePessoas({ results: [], page: 1, maxPage: 1 }));

    await criarClient().fetchPeopleByJurisdiction('California');

    expect(urlDaChamada(fetchMock.mock.calls[0]![0]).href).not.toContain(API_KEY);
  });

  it('pagina usando pagination.max_page e concatena os resultados', async () => {
    fetchMock
      .mockResolvedValueOnce(paginaDePessoas({ results: [pessoa('a')], page: 1, maxPage: 3 }))
      .mockResolvedValueOnce(paginaDePessoas({ results: [pessoa('b')], page: 2, maxPage: 3 }))
      .mockResolvedValueOnce(paginaDePessoas({ results: [pessoa('c')], page: 3, maxPage: 3 }));

    const pessoas = await criarClient().fetchPeopleByJurisdiction('California');

    expect(pessoas.map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(
      fetchMock.mock.calls.map((chamada) => urlDaChamada(chamada[0]).searchParams.get('page')),
    ).toEqual(['1', '2', '3']);
  });

  it('chama sleep(requestDelayMs) entre as requisições, mas não após a última', async () => {
    fetchMock
      .mockResolvedValueOnce(paginaDePessoas({ results: [pessoa('a')], page: 1, maxPage: 3 }))
      .mockResolvedValueOnce(paginaDePessoas({ results: [pessoa('b')], page: 2, maxPage: 3 }))
      .mockResolvedValueOnce(paginaDePessoas({ results: [pessoa('c')], page: 3, maxPage: 3 }));

    await criarClient().fetchPeopleByJurisdiction('California');

    // 3 requisições => 2 pausas.
    expect(sleepMock).toHaveBeenCalledTimes(2);
    expect(sleepMock).toHaveBeenNthCalledWith(1, DELAY_MS);
    expect(sleepMock).toHaveBeenNthCalledWith(2, DELAY_MS);
  });

  it('não dorme quando há uma única página', async () => {
    fetchMock.mockResolvedValueOnce(
      paginaDePessoas({ results: [pessoa('a')], page: 1, maxPage: 1 }),
    );

    await criarClient().fetchPeopleByJurisdiction('California');

    expect(sleepMock).not.toHaveBeenCalled();
  });

  it('dorme antes da primeira página de uma chamada subsequente (throttle entre estados)', async () => {
    // A última página do estado anterior pode ter saído há menos de um intervalo;
    // sem esta pausa, a troca de estado vira o ponto exato onde o 429 aparece.
    fetchMock
      .mockResolvedValueOnce(paginaDePessoas({ results: [pessoa('a')], page: 1, maxPage: 1 }))
      .mockResolvedValueOnce(paginaDePessoas({ results: [pessoa('b')], page: 1, maxPage: 1 }));

    const client = criarClient();
    await client.fetchPeopleByJurisdiction('California');
    await client.fetchPeopleByJurisdiction('New York');

    expect(sleepMock).toHaveBeenCalledTimes(1);
    expect(sleepMock).toHaveBeenCalledWith(DELAY_MS);
  });

  it('incrementa requestCount uma vez por requisição HTTP', async () => {
    fetchMock
      .mockResolvedValueOnce(paginaDePessoas({ results: [], page: 1, maxPage: 2 }))
      .mockResolvedValueOnce(paginaDePessoas({ results: [], page: 2, maxPage: 2 }));

    const client = criarClient();
    expect(client.requestCount).toBe(0);

    await client.fetchPeopleByJurisdiction('California');

    expect(client.requestCount).toBe(2);
  });

  describe('aviso de per_page', () => {
    it('avisa exatamente uma vez quando o per_page efetivo é menor que o pedido', async () => {
      // A API corta 50 -> 10: o custo de cota sobe ~5x, em silêncio.
      fetchMock
        .mockResolvedValueOnce(paginaDePessoas({ results: [], page: 1, maxPage: 3, perPage: 10 }))
        .mockResolvedValueOnce(paginaDePessoas({ results: [], page: 2, maxPage: 3, perPage: 10 }))
        .mockResolvedValueOnce(paginaDePessoas({ results: [], page: 3, maxPage: 3, perPage: 10 }));

      await criarClient().fetchPeopleByJurisdiction('California');

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(vi.mocked(logger.warn).mock.calls[0]![0]).toMatch(/per_page/);
    });

    it('não avisa quando o per_page efetivo é igual ao pedido', async () => {
      fetchMock.mockResolvedValueOnce(
        paginaDePessoas({ results: [], page: 1, maxPage: 1, perPage: 50 }),
      );

      await criarClient().fetchPeopleByJurisdiction('California');

      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('rate limit', () => {
    it('faz retry em 429 respeitando o Retry-After e depois tem sucesso', async () => {
      fetchMock
        .mockResolvedValueOnce(tooManyRequests(2))
        .mockResolvedValueOnce(paginaDePessoas({ results: [pessoa('a')], page: 1, maxPage: 1 }));

      const client = criarClient();
      const pessoas = await client.fetchPeopleByJurisdiction('California');

      expect(pessoas.map((p) => p.id)).toEqual(['a']);
      // Retry-After vem em segundos; o sleep é em ms.
      expect(sleepMock).toHaveBeenCalledWith(2000);
      // A tentativa que tomou 429 também consumiu cota.
      expect(client.requestCount).toBe(2);
    });

    it('sem Retry-After, usa backoff crescente que atravessa a janela do minuto', async () => {
      // O tier default da OpenStates é 10 req/MINUTO: a última tentativa precisa
      // esperar 65s para cair garantidamente fora da janela que gerou o 429.
      fetchMock
        .mockResolvedValueOnce(tooManyRequests())
        .mockResolvedValueOnce(tooManyRequests())
        .mockResolvedValueOnce(paginaDePessoas({ results: [pessoa('a')], page: 1, maxPage: 1 }));

      const pessoas = await criarClient().fetchPeopleByJurisdiction('California');

      expect(pessoas.map((p) => p.id)).toEqual(['a']);
      expect(sleepMock).toHaveBeenNthCalledWith(1, 5000);
      expect(sleepMock).toHaveBeenNthCalledWith(2, 65000);
    });

    it('o backoff satura no último degrau quando há mais tentativas que degraus', async () => {
      fetchMock.mockResolvedValue(tooManyRequests());

      const erro = await capturarErro(
        criarClient(5).fetchPeopleByJurisdiction('California'),
        RateLimitExhaustedError,
      );

      // Degraus 5s, 65s e depois repete 65s — nunca volta a re-tentar rápido.
      expect(erro.attempts).toBe(5);
      expect(sleepMock.mock.calls.map((c) => c[0])).toEqual([5000, 65000, 65000, 65000]);
    });

    it('loga o corpo do 429 — é o que distingue burst de cota diária', async () => {
      fetchMock
        .mockResolvedValueOnce(tooManyRequests())
        .mockResolvedValueOnce(paginaDePessoas({ results: [], page: 1, maxPage: 1 }));

      await criarClient().fetchPeopleByJurisdiction('California');

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(vi.mocked(logger.warn).mock.calls[0]![0]).toMatch(/429.*tentativa 1\/3/);
    });

    it('lança RateLimitExhaustedError ao esgotar as tentativas', async () => {
      fetchMock.mockResolvedValue(tooManyRequests(1));

      const client = criarClient(3);
      const erro = await capturarErro(
        client.fetchPeopleByJurisdiction('California'),
        RateLimitExhaustedError,
      );

      expect(erro.attempts).toBe(3);
      expect(erro.lastRetryAfterMs).toBe(1000);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('5xx transitório', () => {
    it('faz retry em 502 com backoff curto e depois tem sucesso', async () => {
      fetchMock
        .mockResolvedValueOnce(erroHttp(502, 'Bad Gateway'))
        .mockResolvedValueOnce(paginaDePessoas({ results: [pessoa('a')], page: 1, maxPage: 1 }));

      const pessoas = await criarClient().fetchPeopleByJurisdiction('Maine');

      expect(pessoas.map((p) => p.id)).toEqual(['a']);
      expect(sleepMock).toHaveBeenCalledExactlyOnceWith(2000);
    });

    it('propaga OpenStatesHttpError quando o 502 persiste após as tentativas', async () => {
      fetchMock.mockResolvedValue(erroHttp(502, 'Bad Gateway'));

      const erro = await capturarErro(
        criarClient(3).fetchPeopleByJurisdiction('Maine'),
        OpenStatesHttpError,
      );

      // 5xx persistente propaga o erro HTTP real — não vira falso rate limit.
      expect(erro.status).toBe(502);
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(sleepMock.mock.calls.map((c) => c[0])).toEqual([2000, 10000]);
    });
  });

  it('lança OpenStatesHttpError em 500', async () => {
    fetchMock.mockResolvedValueOnce(erroHttp(500, 'Internal Server Error'));

    const erro = await capturarErro(
      criarClient().fetchPeopleByJurisdiction('California'),
      OpenStatesHttpError,
    );

    expect(erro.status).toBe(500);
    expect(erro.url).toContain('/people');
  });

  it('não faz retry em erro que não seja 429', async () => {
    fetchMock.mockResolvedValue(erroHttp(500, 'Internal Server Error'));

    await criarClient()
      .fetchPeopleByJurisdiction('California')
      .catch(() => undefined);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('nunca passa a api key para o logger', async () => {
    fetchMock.mockResolvedValueOnce(
      paginaDePessoas({ results: [], page: 1, maxPage: 1, perPage: 10 }),
    );

    await criarClient().fetchPeopleByJurisdiction('California');

    const tudoQueFoiLogado = [
      ...vi.mocked(logger.info).mock.calls,
      ...vi.mocked(logger.warn).mock.calls,
      ...vi.mocked(logger.error).mock.calls,
    ]
      .flat()
      .map((arg) => String(arg))
      .join(' ');

    expect(tudoQueFoiLogado).not.toContain(API_KEY);
  });
});

describe('fetchStateJurisdictions', () => {
  it('chama /jurisdictions?classification=state e devolve a lista', async () => {
    fetchMock.mockResolvedValueOnce(
      paginaDeJurisdicoes([jurisdicao('ocd-jurisdiction/country:us/state:ca', 'California')]),
    );

    const jurisdicoes = await criarClient().fetchStateJurisdictions();

    const url = urlDaChamada(fetchMock.mock.calls[0]![0]);
    expect(url.origin + url.pathname).toBe(`${BASE_URL}/jurisdictions`);
    expect(url.searchParams.get('classification')).toBe('state');
    expect(jurisdicoes.map((j) => j.name)).toEqual(['California']);
  });

  it('pagina quando há mais de uma página', async () => {
    fetchMock
      .mockResolvedValueOnce(
        paginaDeJurisdicoes([jurisdicao('ca', 'California')], { page: 1, maxPage: 2 }),
      )
      .mockResolvedValueOnce(
        paginaDeJurisdicoes([jurisdicao('ny', 'New York')], { page: 2, maxPage: 2 }),
      );

    const jurisdicoes = await criarClient().fetchStateJurisdictions();

    expect(jurisdicoes.map((j) => j.name)).toEqual(['California', 'New York']);
    expect(sleepMock).toHaveBeenCalledTimes(1);
  });

  it('incrementa o requestCount', async () => {
    fetchMock.mockResolvedValueOnce(paginaDeJurisdicoes([jurisdicao('ca', 'California')]));

    const client = criarClient();
    await client.fetchStateJurisdictions();

    expect(client.requestCount).toBe(1);
  });

  it('propaga OpenStatesHttpError', async () => {
    fetchMock.mockResolvedValueOnce(erroHttp(403, 'Forbidden'));

    await expect(criarClient().fetchStateJurisdictions()).rejects.toBeInstanceOf(
      OpenStatesHttpError,
    );
  });
});
