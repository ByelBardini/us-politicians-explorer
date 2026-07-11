import type { Logger } from '../lib/logger.js';

import { OpenStatesHttpError, RateLimitExhaustedError } from './errors.js';
import type {
  OpenStatesJurisdiction,
  OpenStatesJurisdictionsResponse,
  OpenStatesPeopleResponse,
  OpenStatesPerson,
} from './types.js';

/**
 * Client da OpenStates v3.
 *
 * A cota do tier free (~500 req/dia, ~1 req/s) é o recurso escasso do projeto:
 * throttle entre requisições, retry educado em 429 e contagem de requisições
 * existem por causa dela.
 *
 * `fetch` e `sleep` são injetados para os testes verificarem paginação e
 * throttle sem rede nem espera real.
 */
export interface OpenStatesGateway {
  fetchPeopleByJurisdiction(jurisdiction: string): Promise<OpenStatesPerson[]>;
  fetchStateJurisdictions(): Promise<OpenStatesJurisdiction[]>;
  readonly requestCount: number;
}

export interface OpenStatesClientDeps {
  apiKey: string;
  baseUrl: string;
  perPage: number;
  requestDelayMs: number;
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  logger: Logger;
  maxRetries?: number;
}

const MAX_RETRIES_PADRAO = 3;

export class OpenStatesClient implements OpenStatesGateway {
  readonly #deps: OpenStatesClientDeps;
  readonly #maxRetries: number;
  #requestCount = 0;
  #avisouPerPage = false;

  constructor(deps: OpenStatesClientDeps) {
    this.#deps = deps;
    this.#maxRetries = deps.maxRetries ?? MAX_RETRIES_PADRAO;
  }

  /** Requisições feitas até agora. A cota diária é finita — o sync reporta isso. */
  get requestCount(): number {
    return this.#requestCount;
  }

  async fetchPeopleByJurisdiction(jurisdiction: string): Promise<OpenStatesPerson[]> {
    return this.#paginar<OpenStatesPeopleResponse, OpenStatesPerson>('/people', (page) => ({
      jurisdiction,
      per_page: String(this.#deps.perPage),
      page: String(page),
      // Sem isto a API omite `offices` e a coluna `contatos` ficaria sempre null.
      include: 'offices',
    }));
  }

  async fetchStateJurisdictions(): Promise<OpenStatesJurisdiction[]> {
    return this.#paginar<OpenStatesJurisdictionsResponse, OpenStatesJurisdiction>(
      '/jurisdictions',
      (page) => ({ classification: 'state', page: String(page) }),
    );
  }

  /** Percorre as páginas até `pagination.max_page`, com throttle entre elas. */
  async #paginar<TResposta extends { results: TItem[]; pagination: { max_page: number } }, TItem>(
    caminho: string,
    queryDaPagina: (page: number) => Record<string, string>,
  ): Promise<TItem[]> {
    const itens: TItem[] = [];
    let page = 1;
    let maxPage = 1;

    while (page <= maxPage) {
      // Throttle: pausa ANTES de cada requisição exceto a primeira, para nunca
      // dormir depois da última (seria latência pura, sem proteger nada).
      if (page > 1) await this.#deps.sleep(this.#deps.requestDelayMs);

      const resposta = await this.#buscarComRetry<TResposta>(caminho, queryDaPagina(page));

      itens.push(...resposta.results);
      maxPage = resposta.pagination.max_page;
      this.#avisarSePerPageFoiCortado(resposta);
      page += 1;
    }

    return itens;
  }

  /** Uma página, com retry só em 429. Outros erros propagam na hora. */
  async #buscarComRetry<T>(caminho: string, query: Record<string, string>): Promise<T> {
    const url = new URL(caminho, this.#deps.baseUrl);
    for (const [chave, valor] of Object.entries(query)) url.searchParams.set(chave, valor);

    let ultimoRetryAfterMs: number | undefined;

    for (let tentativa = 1; tentativa <= this.#maxRetries; tentativa += 1) {
      this.#requestCount += 1;

      // A key vai no header, nunca na URL — assim não vaza em log de erro.
      const resposta = await this.#deps.fetch(url, {
        headers: { 'X-Api-Key': this.#deps.apiKey, Accept: 'application/json' },
      });

      if (resposta.ok) return (await resposta.json()) as T;

      if (resposta.status === 429) {
        ultimoRetryAfterMs = this.#lerRetryAfter(resposta);
        // Não dorme após a última tentativa: ninguém vai usar essa espera.
        if (tentativa < this.#maxRetries) await this.#deps.sleep(ultimoRetryAfterMs);
        continue;
      }

      throw new OpenStatesHttpError(
        resposta.status,
        resposta.statusText,
        url.href,
        await resposta.text().catch(() => undefined),
      );
    }

    throw new RateLimitExhaustedError(this.#maxRetries, ultimoRetryAfterMs);
  }

  /** `Retry-After` vem em segundos; sem ele, cai no throttle configurado. */
  #lerRetryAfter(resposta: Response): number {
    const bruto = resposta.headers.get('Retry-After');
    if (bruto === null) return this.#deps.requestDelayMs;

    const segundos = Number(bruto);
    if (!Number.isFinite(segundos) || segundos < 0) return this.#deps.requestDelayMs;

    return segundos * 1000;
  }

  /**
   * A API ecoa o `per_page` efetivo. Se ela cortar 50 -> 10, o número de
   * requisições por sync sobe ~5x e a cota diária estoura em silêncio.
   * Avisa uma vez por instância, não uma vez por página.
   */
  #avisarSePerPageFoiCortado(resposta: { pagination: { max_page: number; per_page?: number } }) {
    const efetivo = resposta.pagination.per_page;
    if (efetivo === undefined || this.#avisouPerPage) return;
    if (efetivo >= this.#deps.perPage) return;

    this.#avisouPerPage = true;
    this.#deps.logger.warn(
      `OpenStates cortou o per_page de ${this.#deps.perPage} para ${efetivo}: ` +
        'o custo de cota por sync sobe na mesma proporção. ' +
        'Considere reduzir SYNC_STATES ou adotar sync rotativo.',
    );
  }
}
