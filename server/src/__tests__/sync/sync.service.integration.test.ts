import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { OpenStatesClient } from '../../openstates/client.js';
import type { OpenStatesPerson } from '../../openstates/types.js';
import { createPoliticosRepository } from '../../politicos/politicos.repository.js';
import { SyncService } from '../../sync/sync.service.js';
import { criarPrisma, limparBanco } from '../helpers/db.js';
import {
  deputadaSemFoto,
  senadoraCompleta,
  viceGovernadoraSemDistrito,
} from '../openstates/helpers/pessoas-reais.js';
import { paginaDePessoas } from '../openstates/helpers/respostas.js';

/**
 * O coração do projeto — o cache — provado ponta a ponta: SyncService real,
 * mapper real, repository real, SQL real. Só o `fetch` da OpenStates é injetado,
 * e por um motivo aritmético, não por preguiça: a cota do tier free é ~500
 * req/dia, e um `npm test` que batesse na API real a queimaria (ver `client.live.test.ts`,
 * que ancora estas fixtures contra a resposta de verdade).
 *
 * O par com `sync.service.test.ts` é deliberado: lá, cota/concorrência/429 sem
 * Docker; aqui, o que só o banco pode responder — a idempotência.
 */
const prisma = criarPrisma();
const repository = createPoliticosRepository(prisma);
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

/** A mesma pessoa, mas na jurisdição do Texas — a busca é por estado. */
const emTexas = (p: OpenStatesPerson): OpenStatesPerson => ({
  ...p,
  jurisdiction: {
    id: 'ocd-jurisdiction/country:us/state:tx/government',
    name: 'Texas',
    classification: 'state',
  },
});

/**
 * Serve as fixtures reais por jurisdição. `rateLimitEm` faz a API estourar 429
 * num estado específico, para exercitar a parada limpa no meio do sync.
 */
const fetchFake = (
  porEstado: Record<string, OpenStatesPerson[]>,
  opcoes: { rateLimitEm?: string } = {},
) =>
  vi.fn(async (entrada: Parameters<typeof fetch>[0]) => {
    const url = new URL(String(entrada));
    const jurisdicao = url.searchParams.get('jurisdiction') ?? '';

    if (opcoes.rateLimitEm === jurisdicao) return new Response('', { status: 429 });

    return paginaDePessoas({ results: porEstado[jurisdicao] ?? [], page: 1, maxPage: 1 });
  }) as unknown as typeof fetch;

const criarSync = (fetchInjetado: typeof fetch, states: string[]) =>
  new SyncService({
    client: new OpenStatesClient({
      apiKey: 'chave-de-teste',
      baseUrl: 'https://v3.openstates.org/',
      perPage: 50,
      requestDelayMs: 0,
      fetch: fetchInjetado,
      sleep: async () => {}, // sem espera real: o throttle é assunto do teste rápido
      logger,
      maxRetries: 2,
    }),
    repository,
    states,
    logger,
  });

beforeEach(() => limparBanco(prisma));
afterAll(() => prisma.$disconnect());

describe('SyncService (Postgres real)', () => {
  it('popula a tabela a partir do payload real da OpenStates', async () => {
    const sync = criarSync(
      fetchFake({ California: [senadoraCompleta, viceGovernadoraSemDistrito] }),
      ['California'],
    );

    const resumo = await sync.run();

    expect(resumo).toMatchObject({ statesSynced: ['California'], upserted: 2, interrupted: false });
    const linhas = await prisma.politico.findMany({ orderBy: { nome: 'asc' } });
    expect(linhas.map((l) => l.nome)).toEqual(['Aisha Wahab', 'Eleni Kounalakis']);

    // O mapper de produção rodou: `death_date: ''` virou null, `offices` virou
    // contatos, e a vice (cargo executivo) entrou sem distrito.
    const senadora = linhas.find((l) => l.nome === 'Aisha Wahab')!;
    expect(senadora.falecimento).toBeNull();
    expect(senadora.contatos).toEqual(senadoraCompleta.offices);
    expect(senadora.nascimento).toEqual(new Date('1978-07-02T00:00:00.000Z'));
    expect(linhas.find((l) => l.nome === 'Eleni Kounalakis')!.distrito).toBeNull();
  });

  it('é idempotente: dois syncs iguais ⇒ mesma contagem, zero duplicatas', async () => {
    const dados = { California: [senadoraCompleta, viceGovernadoraSemDistrito] };

    await criarSync(fetchFake(dados), ['California']).run();
    const depoisDoPrimeiro = await prisma.politico.findMany({ orderBy: { openstatesId: 'asc' } });

    // Instância nova, como seria o ciclo do dia seguinte.
    const segundo = await criarSync(fetchFake(dados), ['California']).run();

    const depoisDoSegundo = await prisma.politico.findMany({ orderBy: { openstatesId: 'asc' } });
    expect(segundo.upserted).toBe(2); // escreveu de novo…
    expect(depoisDoSegundo).toHaveLength(2); // …mas não duplicou
    // A chave é o openstatesId: os ids do banco sobrevivem ao re-sync. Se o
    // upsert casasse por outra coluna, aqui haveria 4 linhas com ids novos.
    expect(depoisDoSegundo.map((l) => l.id)).toEqual(depoisDoPrimeiro.map((l) => l.id));
  });

  it('atualiza a linha existente quando o dado muda (UPDATE, não INSERT)', async () => {
    await criarSync(fetchFake({ California: [senadoraCompleta] }), ['California']).run();
    const antes = await prisma.politico.findUniqueOrThrow({
      where: { openstatesId: senadoraCompleta.id },
    });

    // `atualizadoEm` tem resolução de milissegundo: sem a pausa, o assert de
    // "avançou" poderia passar por acidente com os dois valores iguais.
    await new Promise((r) => setTimeout(r, 5));

    // No dia seguinte a OpenStates devolve a mesma pessoa com o partido trocado.
    const alterada: OpenStatesPerson = { ...senadoraCompleta, party: 'Independent' };
    await criarSync(fetchFake({ California: [alterada] }), ['California']).run();

    const depois = await prisma.politico.findUniqueOrThrow({
      where: { openstatesId: senadoraCompleta.id },
    });
    expect(await prisma.politico.count()).toBe(1);
    expect(depois.id).toBe(antes.id);
    expect(depois.partido).toBe('Independent'); // o dado fresco venceu
    expect(depois.criadoEm).toEqual(antes.criadoEm); // INSERT não aconteceu de novo
    expect(depois.atualizadoEm.getTime()).toBeGreaterThan(antes.atualizadoEm.getTime());
  });

  it('para limpo no 429: o que entrou antes permanece no banco', async () => {
    const sync = criarSync(
      fetchFake(
        {
          California: [senadoraCompleta, viceGovernadoraSemDistrito],
          Texas: [emTexas(deputadaSemFoto)],
        },
        { rateLimitEm: 'Texas' }, // a cota estoura no 2º estado
      ),
      ['California', 'Texas', 'New York'],
    );

    const resumo = await sync.run();

    expect(resumo.interrupted).toBe(true);
    expect(resumo.statesSynced).toEqual(['California']);
    // Texas estourou e New York nem chegou a rodar: os dois voltam no próximo ciclo.
    expect(resumo.statesPending).toEqual(['Texas', 'New York']);

    // O ponto: a interrupção não faz rollback do que já entrou. Retomar depois é
    // seguro justamente porque o upsert é idempotente (teste acima).
    const linhas = await prisma.politico.findMany();
    expect(linhas).toHaveLength(2);
    expect(linhas.every((l) => l.estado === 'California')).toBe(true);
  });
});
