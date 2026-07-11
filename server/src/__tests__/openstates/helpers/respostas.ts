import type {
  OpenStatesJurisdiction,
  OpenStatesJurisdictionsResponse,
  OpenStatesPeopleResponse,
  OpenStatesPerson,
} from '../../../openstates/types.js';

/** Pessoa mínima; sobrescreva só o que o teste investiga. */
export const pessoa = (id: string, extras: Partial<OpenStatesPerson> = {}): OpenStatesPerson => ({
  id,
  name: `Politico ${id}`,
  ...extras,
});

export const jurisdicao = (id: string, name: string): OpenStatesJurisdiction => ({
  id,
  name,
  classification: 'state',
});

/** `Response` de sucesso com corpo JSON. */
export const jsonOk = (corpo: unknown): Response =>
  new Response(JSON.stringify(corpo), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

/** Página de `/people`. `maxPage` controla quantas páginas o client vai buscar. */
export const paginaDePessoas = (opcoes: {
  results: OpenStatesPerson[];
  page: number;
  maxPage: number;
  perPage?: number;
}): Response => {
  const corpo: OpenStatesPeopleResponse = {
    results: opcoes.results,
    pagination: {
      per_page: opcoes.perPage ?? 50,
      page: opcoes.page,
      max_page: opcoes.maxPage,
      total_items: opcoes.results.length * opcoes.maxPage,
    },
  };
  return jsonOk(corpo);
};

export const paginaDeJurisdicoes = (
  results: OpenStatesJurisdiction[],
  opcoes: { page?: number; maxPage?: number } = {},
): Response => {
  const corpo: OpenStatesJurisdictionsResponse = {
    results,
    pagination: {
      per_page: 52,
      page: opcoes.page ?? 1,
      max_page: opcoes.maxPage ?? 1,
      total_items: results.length,
    },
  };
  return jsonOk(corpo);
};

/** 429 com `Retry-After` opcional (em segundos, como manda o HTTP). */
export const tooManyRequests = (retryAfterSegundos?: number): Response =>
  new Response('rate limited', {
    status: 429,
    statusText: 'Too Many Requests',
    headers: retryAfterSegundos === undefined ? {} : { 'Retry-After': String(retryAfterSegundos) },
  });

export const erroHttp = (status: number, statusText: string, corpo = 'boom'): Response =>
  new Response(corpo, { status, statusText });

/**
 * Executa a promise esperando que ela rejeite, e devolve o erro já tipado.
 * Falha o teste se ela resolver — sem isso, um `.catch()` deixaria o tipo como
 * união (erro | resultado) e o acesso aos campos do erro não compilaria.
 */
export const capturarErro = async <T extends Error>(
  promessa: Promise<unknown>,
  Tipo: new (...args: never[]) => T,
): Promise<T> => {
  try {
    await promessa;
  } catch (erro) {
    if (erro instanceof Tipo) return erro;
    throw new Error(`esperava ${Tipo.name}, veio ${String(erro)}`);
  }
  throw new Error(`esperava que a promise rejeitasse com ${Tipo.name}, mas ela resolveu`);
};

/** Extrai a URL de uma chamada do fetch mockado, seja string, URL ou Request. */
export const urlDaChamada = (entrada: unknown): URL => {
  if (typeof entrada === 'string') return new URL(entrada);
  if (entrada instanceof URL) return entrada;
  if (entrada instanceof Request) return new URL(entrada.url);
  throw new Error(`entrada de fetch inesperada: ${String(entrada)}`);
};
