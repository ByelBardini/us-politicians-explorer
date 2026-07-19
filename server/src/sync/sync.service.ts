import type { Logger } from '../lib/logger.js';
import type { OpenStatesGateway } from '../openstates/client.js';
import { OpenStatesHttpError, RateLimitExhaustedError } from '../openstates/errors.js';
import { mapPersonToPolitico } from '../openstates/mapper.js';
import type { PoliticosRepository } from '../politicos/politicos.repository.js';

/**
 * Sincroniza o cache do Postgres a partir da OpenStates, estado a estado.
 *
 * Depende de `OpenStatesGateway` e `PoliticosRepository` — interfaces, não do
 * Prisma nem do client HTTP concreto. É o que permite testar todo o fluxo
 * (incluindo a parada por cota) sem banco e sem gastar requisição.
 */

export interface SyncSummary {
  /** Estados percorridos até o fim. */
  statesSynced: string[];
  /**
   * Estados que ficaram para o próximo ciclo: os que falharam no gateway
   * (pulados), o que estourou a cota e os que nem chegaram a rodar.
   */
  statesPending: string[];
  upserted: number;
  /** Requisições que ESTE sync consumiu da cota diária. */
  requests: number;
  interrupted: boolean;
  durationMs: number;
}

export interface SyncServiceDeps {
  client: OpenStatesGateway;
  repository: PoliticosRepository;
  /** Vazio = todos os estados (lista canônica vinda de `/jurisdictions`). */
  states: string[];
  logger: Logger;
  /** Injetável para o teste afirmar `durationMs` exato, sem relógio real. */
  now?: () => number;
}

export class SyncService {
  readonly #deps: SyncServiceDeps;
  readonly #now: () => number;
  /** Execução em andamento, reaproveitada por chamadas concorrentes. */
  #emAndamento?: Promise<SyncSummary>;

  constructor(deps: SyncServiceDeps) {
    this.#deps = deps;
    this.#now = deps.now ?? Date.now;
  }

  /**
   * Um sync por vez. O cron e o `POST /api/sync` podem disparar juntos; sem
   * este guard, dobrariam o consumo da cota diária. O segundo chamador recebe
   * o resultado do primeiro.
   */
  async run(overrideStates?: string[]): Promise<SyncSummary> {
    this.#emAndamento ??= this.#executar(overrideStates).finally(() => {
      // `finally` mesmo em caso de erro: senão uma falha travaria o service para sempre.
      this.#emAndamento = undefined;
    });

    return this.#emAndamento;
  }

  async #executar(overrideStates?: string[]): Promise<SyncSummary> {
    const inicio = this.#now();
    const requisicoesAntes = this.#deps.client.requestCount;

    const estados = await this.#resolverEstados(overrideStates);
    const statesSynced: string[] = [];
    const statesPending: string[] = [];
    let upserted = 0;

    for (const [indice, estado] of estados.entries()) {
      try {
        upserted += await this.#sincronizarEstado(estado);
        statesSynced.push(estado);
      } catch (erro) {
        if (erro instanceof RateLimitExhaustedError) {
          // Parada limpa: o upsert é idempotente por openstatesId, então retomar
          // no próximo ciclo é seguro. Degradar assim é melhor que falhar.
          this.#deps.logger.warn(
            `Cota da OpenStates esgotada em "${estado}". ` +
              `Sync interrompido; ${estados.length - indice} estado(s) ficam para o próximo ciclo.`,
          );

          return this.#resumo({
            statesSynced,
            statesPending: [...statesPending, ...estados.slice(indice)],
            upserted,
            requisicoesAntes,
            interrupted: true,
            inicio,
          });
        }

        // Erro do gateway restrito a este estado (5xx persistente, dado
        // inesperado): pular custa 1 estado; propagar custaria todos os
        // seguintes. Qualquer outra falha (ex.: banco) propaga — continuar
        // sem persistir só queimaria cota.
        if (!(erro instanceof OpenStatesHttpError)) throw erro;

        this.#deps.logger.error(
          `Falha ao sincronizar "${estado}"; seguindo para o próximo estado.`,
          erro,
        );
        statesPending.push(estado);
      }
    }

    return this.#resumo({
      statesSynced,
      statesPending,
      upserted,
      requisicoesAntes,
      interrupted: false,
      inicio,
    });
  }

  /** Override da chamada → `SYNC_STATES` → todos (via `/jurisdictions`). */
  async #resolverEstados(overrideStates?: string[]): Promise<string[]> {
    if (overrideStates?.length) return overrideStates;
    if (this.#deps.states.length) return this.#deps.states;

    const jurisdicoes = await this.#deps.client.fetchStateJurisdictions();
    return jurisdicoes.map((jurisdicao) => jurisdicao.name);
  }

  async #sincronizarEstado(estado: string): Promise<number> {
    const pessoas = await this.#deps.client.fetchPeopleByJurisdiction(estado);

    for (const pessoa of pessoas) {
      // `estado` é o fallback: a API às vezes omite `jurisdiction`.
      await this.#deps.repository.upsertByOpenstatesId(mapPersonToPolitico(pessoa, estado));
    }

    this.#deps.logger.info(`${estado}: ${pessoas.length} político(s) sincronizado(s).`);
    return pessoas.length;
  }

  #resumo(dados: {
    statesSynced: string[];
    statesPending: string[];
    upserted: number;
    requisicoesAntes: number;
    interrupted: boolean;
    inicio: number;
  }): SyncSummary {
    return {
      statesSynced: dados.statesSynced,
      statesPending: dados.statesPending,
      upserted: dados.upserted,
      // Delta, não total: é o que este sync tirou da cota do dia.
      requests: this.#deps.client.requestCount - dados.requisicoesAntes,
      interrupted: dados.interrupted,
      durationMs: this.#now() - dados.inicio,
    };
  }
}
