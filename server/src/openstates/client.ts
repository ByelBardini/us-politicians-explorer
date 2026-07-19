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
 * A cota do tier free (10 req/minuto, 500 req/dia) é o recurso escasso do
 * projeto: throttle entre requisições, retry educado em 429 e contagem de
 * requisições existem por causa dela.
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

/**
 * Espera antes de re-tentar um 429 que veio SEM `Retry-After`. O tier default da
 * OpenStates é 10 req/MINUTO (e 500/dia): o degrau final de 65s existe para a
 * última tentativa cair garantidamente fora da janela do minuto que gerou o 429.
 * Re-tentar rápido demais só coleciona 429 até virar um falso "cota esgotada".
 */
const BACKOFF_429_MS = [5_000, 65_000, 65_000];

/**
 * 5xx transitórios do gateway da OpenStates (nginx piscando durante syncs
 * longos). Retry curto resolve; já 500 fica de fora — costuma ser bug de dado
 * do lado deles e re-tentar não muda o resultado.
 */
const STATUS_TRANSITORIOS = new Set([502, 503, 504]);
const BACKOFF_5XX_MS = [2_000, 10_000, 10_000];

export class OpenStatesClient implements OpenStatesGateway {
  readonly #deps: OpenStatesClientDeps;
  readonly #maxRetries: number;
  #requestCount = 0;
  #avisouPerPage = false;
  /** Já houve alguma requisição nesta instância? Controla o throttle da primeira página. */
  #jaRequisitou = false;

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
      // Throttle: pausa ANTES de cada requisição exceto a primeira da instância,
      // para nunca dormir depois da última (seria latência pura). Vale também
      // para a primeira página de um novo estado: a última página do estado
      // anterior pode ter saído há menos de um intervalo.
      if (this.#jaRequisitou) await this.#deps.sleep(this.#deps.requestDelayMs);
      this.#jaRequisitou = true;

      const resposta = await this.#buscarComRetry<TResposta>(caminho, queryDaPagina(page));

      itens.push(...resposta.results);
      maxPage = resposta.pagination.max_page;
      this.#avisarSePerPageFoiCortado(resposta);
      page += 1;
    }

    return itens;
  }

  /** Uma página, com retry em 429 e nos 5xx transitórios. O resto propaga na hora. */
  async #buscarComRetry<T>(caminho: string, query: Record<string, string>): Promise<T> {
    const url = new URL(caminho, this.#deps.baseUrl);
    for (const [chave, valor] of Object.entries(query)) url.searchParams.set(chave, valor);

    let ultimoRetryAfterMs: number | undefined;
    let ultimoErroTransitorio: OpenStatesHttpError | undefined;

    for (let tentativa = 1; tentativa <= this.#maxRetries; tentativa += 1) {
      this.#requestCount += 1;

      // A key vai no header, nunca na URL — assim não vaza em log de erro.
      const resposta = await this.#deps.fetch(url, {
        headers: { 'X-Api-Key': this.#deps.apiKey, Accept: 'application/json' },
      });

      if (resposta.ok) return (await resposta.json()) as T;

      if (resposta.status === 429) {
        // Sem `Retry-After`, backoff crescente por tentativa: repetir o throttle
        // normal cairia na mesma janela de rate limit que gerou o 429.
        ultimoRetryAfterMs =
          this.#lerRetryAfter(resposta) ??
          BACKOFF_429_MS[Math.min(tentativa, BACKOFF_429_MS.length) - 1]!;

        // O corpo do 429 diz QUAL limite estourou (minuto vs dia) — sem isso o
        // log de "cota esgotada" não distingue burst de cota diária de verdade.
        const detalhe = await resposta.text().catch(() => '');
        this.#deps.logger.warn(
          `OpenStates respondeu 429 (tentativa ${tentativa}/${this.#maxRetries})` +
            `${detalhe ? `: ${detalhe}` : ''}. Aguardando ${ultimoRetryAfterMs}ms.`,
        );

        // Não dorme após a última tentativa: ninguém vai usar essa espera.
        ultimoErroTransitorio = undefined;
        if (tentativa < this.#maxRetries) await this.#deps.sleep(ultimoRetryAfterMs);
        continue;
      }

      const erro = new OpenStatesHttpError(
        resposta.status,
        resposta.statusText,
        url.href,
        await resposta.text().catch(() => undefined),
      );

      // Gateway piscou (502/503/504): retry curto. Qualquer outro status é
      // fatal na hora — retry não conserta requisição inválida nem bug de dado.
      if (STATUS_TRANSITORIOS.has(resposta.status)) {
        ultimoErroTransitorio = erro;
        const espera = BACKOFF_5XX_MS[Math.min(tentativa, BACKOFF_5XX_MS.length) - 1]!;
        this.#deps.logger.warn(
          `OpenStates respondeu ${resposta.status} (tentativa ${tentativa}/${this.#maxRetries}). ` +
            `Aguardando ${espera}ms.`,
        );
        if (tentativa < this.#maxRetries) await this.#deps.sleep(espera);
        continue;
      }

      throw erro;
    }

    // O motivo da última tentativa decide o erro final: 5xx persistente propaga
    // o próprio erro HTTP; 429 persistente vira a parada limpa de rate limit.
    if (ultimoErroTransitorio) throw ultimoErroTransitorio;
    throw new RateLimitExhaustedError(this.#maxRetries, ultimoRetryAfterMs);
  }

  /** `Retry-After` vem em segundos; ausente ou inválido → o backoff decide. */
  #lerRetryAfter(resposta: Response): number | undefined {
    const bruto = resposta.headers.get('Retry-After');
    if (bruto === null) return undefined;

    const segundos = Number(bruto);
    if (!Number.isFinite(segundos) || segundos < 0) return undefined;

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
