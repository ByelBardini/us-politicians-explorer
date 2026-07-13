import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Logger } from '../../lib/logger.js';
import type { OpenStatesGateway } from '../../openstates/client.js';
import { OpenStatesHttpError, RateLimitExhaustedError } from '../../openstates/errors.js';
import type { OpenStatesPerson } from '../../openstates/types.js';
import type { PoliticosRepository } from '../../politicos/politicos.repository.js';
import { SyncService } from '../../sync/sync.service.js';
import { jurisdicao, pessoa } from '../openstates/helpers/respostas.js';

/**
 * Gateway falso com contador de requisições próprio — o `requestCount` real é
 * lido antes/depois pelo service para calcular o delta de cota consumida.
 */
class GatewayFalso implements OpenStatesGateway {
  requestCount = 0;
  readonly fetchPeopleByJurisdiction = vi.fn(async (jurisdicao: string) => {
    this.requestCount += 1;
    return this.porEstado[jurisdicao] ?? [];
  });
  readonly fetchStateJurisdictions = vi.fn(async () => {
    this.requestCount += 1;
    return this.jurisdicoes;
  });

  constructor(
    private readonly porEstado: Record<string, OpenStatesPerson[]> = {},
    private readonly jurisdicoes = [jurisdicao('ca', 'California')],
  ) {}
}

let repository: PoliticosRepository & { upsertByOpenstatesId: ReturnType<typeof vi.fn> };
let logger: Logger;

const criarService = (opcoes: {
  client: OpenStatesGateway;
  states?: string[];
  now?: () => number;
}) =>
  new SyncService({
    client: opcoes.client,
    repository,
    states: opcoes.states ?? [],
    logger,
    ...(opcoes.now ? { now: opcoes.now } : {}),
  });

beforeEach(() => {
  repository = {
    upsertByOpenstatesId: vi.fn().mockResolvedValue(undefined),
    // Não usados pelo SyncService; presentes só para satisfazer a interface.
    listarPoliticos: vi.fn().mockResolvedValue({ dados: [], total: 0 }),
    listarFiltros: vi.fn().mockResolvedValue({ estados: [], partidos: [] }),
  };
  logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
});

describe('SyncService.run', () => {
  describe('resolução dos estados', () => {
    it('usa os estados do argumento override', async () => {
      const client = new GatewayFalso({ Texas: [pessoa('a')] });

      const resumo = await criarService({ client, states: ['California'] }).run(['Texas']);

      expect(client.fetchPeopleByJurisdiction).toHaveBeenCalledExactlyOnceWith('Texas');
      expect(resumo.statesSynced).toEqual(['Texas']);
    });

    it('usa os estados configurados quando não há override', async () => {
      const client = new GatewayFalso({ California: [pessoa('a')], 'New York': [pessoa('b')] });

      const resumo = await criarService({
        client,
        states: ['California', 'New York'],
      }).run();

      expect(resumo.statesSynced).toEqual(['California', 'New York']);
      expect(client.fetchStateJurisdictions).not.toHaveBeenCalled();
    });

    it('busca todas as jurisdições quando a lista configurada está vazia', async () => {
      // SYNC_STATES vazio = todos os estados (a lista canônica vem da API).
      const client = new GatewayFalso({ California: [pessoa('a')], Texas: [pessoa('b')] }, [
        jurisdicao('ca', 'California'),
        jurisdicao('tx', 'Texas'),
      ]);

      const resumo = await criarService({ client, states: [] }).run();

      expect(client.fetchStateJurisdictions).toHaveBeenCalledOnce();
      expect(resumo.statesSynced).toEqual(['California', 'Texas']);
    });
  });

  describe('upsert', () => {
    it('mapeia e faz upsert de cada pessoa de cada estado', async () => {
      const client = new GatewayFalso({
        California: [pessoa('a'), pessoa('b')],
        Texas: [pessoa('c')],
      });

      const resumo = await criarService({ client, states: ['California', 'Texas'] }).run();

      expect(repository.upsertByOpenstatesId).toHaveBeenCalledTimes(3);
      expect(resumo.upserted).toBe(3);
    });

    it('passa o estado da busca como fallback para o mapper', async () => {
      // A pessoa não traz `jurisdiction`; o estado tem que vir da busca.
      const client = new GatewayFalso({ Texas: [pessoa('a')] });

      await criarService({ client, states: ['Texas'] }).run();

      const payload = repository.upsertByOpenstatesId.mock.calls[0]![0] as { estado: string };
      expect(payload.estado).toBe('Texas');
    });

    it('mapeia o payload antes de persistir', async () => {
      const client = new GatewayFalso({
        California: [pessoa('a', { name: 'Fulana', party: 'Democratic' })],
      });

      await criarService({ client, states: ['California'] }).run();

      expect(repository.upsertByOpenstatesId).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ openstatesId: 'a', nome: 'Fulana', partido: 'Democratic' }),
      );
    });
  });

  describe('resumo', () => {
    it('conta as requisições consumidas (delta do requestCount do client)', async () => {
      const client = new GatewayFalso({ California: [pessoa('a')], Texas: [pessoa('b')] });
      client.requestCount = 7; // já havia consumo anterior

      const resumo = await criarService({ client, states: ['California', 'Texas'] }).run();

      // Só o que ESTE sync gastou: 2 estados = 2 requisições.
      expect(resumo.requests).toBe(2);
    });

    it('calcula durationMs a partir do relógio injetado', async () => {
      const client = new GatewayFalso({ California: [] });
      const now = vi.fn().mockReturnValueOnce(1000).mockReturnValueOnce(1500);

      const resumo = await criarService({ client, states: ['California'], now }).run();

      expect(resumo.durationMs).toBe(500);
    });

    it('não marca interrupted quando tudo corre bem', async () => {
      const client = new GatewayFalso({ California: [pessoa('a')] });

      const resumo = await criarService({ client, states: ['California'] }).run();

      expect(resumo.interrupted).toBe(false);
      expect(resumo.statesPending).toEqual([]);
    });
  });

  describe('parada limpa em rate limit', () => {
    it('para no estado que estourou a cota e devolve os pendentes, sem lançar', async () => {
      const client = new GatewayFalso({ California: [pessoa('a')] });
      client.fetchPeopleByJurisdiction.mockImplementation(async (estado: string) => {
        client.requestCount += 1;
        if (estado === 'Texas') throw new RateLimitExhaustedError(3, 2000);
        return [pessoa('a')];
      });

      const resumo = await criarService({
        client,
        states: ['California', 'Texas', 'New York'],
      }).run();

      expect(resumo.interrupted).toBe(true);
      expect(resumo.statesSynced).toEqual(['California']);
      // O estado que falhou e os que nem chegaram a rodar ficam pendentes.
      expect(resumo.statesPending).toEqual(['Texas', 'New York']);
      // O que já entrou no banco continua lá: o upsert é idempotente.
      expect(resumo.upserted).toBe(1);
    });

    it('não busca os estados seguintes depois de estourar a cota', async () => {
      const client = new GatewayFalso();
      client.fetchPeopleByJurisdiction.mockRejectedValue(new RateLimitExhaustedError(3));

      await criarService({ client, states: ['California', 'Texas'] }).run();

      expect(client.fetchPeopleByJurisdiction).toHaveBeenCalledOnce();
    });
  });

  describe('erros que não são de cota', () => {
    it('propaga OpenStatesHttpError', async () => {
      const client = new GatewayFalso();
      client.fetchPeopleByJurisdiction.mockRejectedValue(
        new OpenStatesHttpError(500, 'Internal Server Error', 'https://v3.openstates.org/people'),
      );

      await expect(criarService({ client, states: ['California'] }).run()).rejects.toBeInstanceOf(
        OpenStatesHttpError,
      );
    });

    it('propaga falha do repository', async () => {
      const client = new GatewayFalso({ California: [pessoa('a')] });
      repository.upsertByOpenstatesId.mockRejectedValueOnce(new Error('conexão perdida'));

      await expect(criarService({ client, states: ['California'] }).run()).rejects.toThrow(
        'conexão perdida',
      );
    });
  });

  describe('guard de concorrência', () => {
    it('reaproveita a execução em andamento em chamadas concorrentes', async () => {
      // Trava a primeira busca até liberarmos, para as duas chamadas se sobreporem.
      let liberar!: () => void;
      const travado = new Promise<void>((resolve) => {
        liberar = resolve;
      });
      const client = new GatewayFalso();
      client.fetchPeopleByJurisdiction.mockImplementation(async () => {
        client.requestCount += 1;
        await travado;
        return [pessoa('a')];
      });

      const service = criarService({ client, states: ['California'] });
      const primeira = service.run();
      const segunda = service.run();

      liberar();
      const [resumo1, resumo2] = await Promise.all([primeira, segunda]);

      // O cron e o POST /api/sync não podem dobrar o consumo de cota.
      expect(client.fetchPeopleByJurisdiction).toHaveBeenCalledOnce();
      expect(resumo1).toBe(resumo2);
    });

    it('libera o guard para que uma execução posterior rode de novo', async () => {
      const client = new GatewayFalso({ California: [pessoa('a')] });
      const service = criarService({ client, states: ['California'] });

      await service.run();
      await service.run();

      expect(client.fetchPeopleByJurisdiction).toHaveBeenCalledTimes(2);
    });

    it('libera o guard mesmo quando o sync falha', async () => {
      const client = new GatewayFalso({ California: [pessoa('a')] });
      client.fetchPeopleByJurisdiction.mockRejectedValueOnce(new Error('falha transitória'));

      const service = criarService({ client, states: ['California'] });
      await expect(service.run()).rejects.toThrow('falha transitória');

      // Sem o finally, um erro deixaria o service travado para sempre.
      await expect(service.run()).resolves.toMatchObject({ upserted: 1 });
    });
  });
});
