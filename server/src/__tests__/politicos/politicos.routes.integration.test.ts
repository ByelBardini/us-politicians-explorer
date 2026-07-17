import { readFileSync } from 'node:fs';

import Ajv2020Cjs from 'ajv/dist/2020.js';
import addFormatsCjs from 'ajv-formats';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../app.js';
import { mapPersonToPolitico } from '../../openstates/mapper.js';
import { createPoliticosRepository } from '../../politicos/politicos.repository.js';
import { criarPrisma, limparBanco } from '../helpers/db.js';
import {
  senadoraCompleta,
  viceGovernadoraSemDistrito,
} from '../openstates/helpers/pessoas-reais.js';
import { pessoa } from '../openstates/helpers/respostas.js';

/**
 * A pilha inteira do backend, de verdade: HTTP → Express → Router → Prisma → SQL.
 *
 * O que isto pega e o teste com `fakeRepo` não pegava: uma query quebrada. Trocar
 * `contains` por `equals` no repository deixa este arquivo vermelho e o outro verde.
 */
const prisma = criarPrisma();
const repository = createPoliticosRepository(prisma);

const openApiDocument = JSON.parse(
  readFileSync(new URL('../../../openapi.json', import.meta.url), 'utf8'),
);

const app = createApp({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  corsOrigin: 'http://localhost:8080',
  repository, // o de verdade, ligado no Postgres do globalSetup
  syncService: { run: vi.fn(async () => ({})) }, // fora do escopo deste arquivo
  openApiDocument,
});

// `ajv` e `ajv-formats` são CJS e o server é ESM: o Node entrega o `.default`,
// enquanto o TS enxerga o namespace do módulo. Reconciliar aqui vale o typecheck.
const Ajv2020 = Ajv2020Cjs.default;
const addFormats = addFormatsCjs.default;

// O mesmo contrato que o frontend valida (Commit 4): as duas pontas no mesmo prego.
const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
ajv.addSchema(openApiDocument, 'openapi.json');
const conferirContrato = (schema: string, valor: unknown) => {
  const validar = ajv.getSchema(`openapi.json#/components/schemas/${schema}`)!;
  return { ok: validar(valor), erros: ajv.errorsText(validar.errors) };
};

beforeEach(() => limparBanco(prisma));
afterAll(() => prisma.$disconnect());

const semear = async () => {
  await repository.upsertByOpenstatesId(
    mapPersonToPolitico(pessoa('ana', { name: 'Ana Souza', party: 'Democratic' }), 'California'),
  );
  await repository.upsertByOpenstatesId(
    mapPersonToPolitico(pessoa('bia', { name: 'Bia Luz', party: 'Democratic' }), 'California'),
  );
  await repository.upsertByOpenstatesId(
    mapPersonToPolitico(pessoa('bob', { name: 'Bob Reis', party: 'Republican' }), 'Texas'),
  );
  await repository.upsertByOpenstatesId(
    mapPersonToPolitico(pessoa('cid', { name: 'Cid Alves' }), 'Texas'), // sem partido
  );
};

describe('GET /api/politicos (Postgres real)', () => {
  it('filtra por estado com SQL de verdade', async () => {
    await semear();

    const res = await request(app).get('/api/politicos?estado=California');

    expect(res.status).toBe(200);
    expect(res.body.pagination).toMatchObject({ total: 2, totalPages: 1 });
    expect(res.body.data.map((p: { nome: string }) => p.nome)).toEqual(['Ana Souza', 'Bia Luz']);
  });

  it('busca por nome em minúsculo (contains insensitive de verdade)', async () => {
    await semear();

    const res = await request(app).get('/api/politicos?q=ana');

    // `Ana Souza` casa com `ana` só porque o `mode: insensitive` chega ao Postgres.
    expect(res.body.pagination.total).toBe(1);
    expect(res.body.data[0].nome).toBe('Ana Souza');
  });

  it('pagina com skip/take reais, sem sobreposição e com totalPages correto', async () => {
    await semear();

    const p1 = await request(app).get('/api/politicos?page=1&perPage=2');
    const p2 = await request(app).get('/api/politicos?page=2&perPage=2');

    expect(p1.body.pagination).toMatchObject({ page: 1, perPage: 2, total: 4, totalPages: 2 });
    expect(p1.body.data).toHaveLength(2);
    expect(p2.body.data).toHaveLength(2);

    const ids1 = p1.body.data.map((p: { id: string }) => p.id);
    const ids2 = p2.body.data.map((p: { id: string }) => p.id);
    expect(ids2.some((id: string) => ids1.includes(id))).toBe(false);
  });

  it('não vaza raw nem openstatesId — afirmado sobre uma linha que existe no banco', async () => {
    await repository.upsertByOpenstatesId(mapPersonToPolitico(senadoraCompleta, 'California'));

    const res = await request(app).get('/api/politicos');

    const dto = res.body.data[0];
    expect(dto.nome).toBe('Aisha Wahab');
    // O `raw` está gravado na tabela (o sync depende dele p/ backfill), mas o
    // contrato público não pode expô-lo.
    const linha = await prisma.politico.findFirstOrThrow();
    expect(linha.raw).not.toBeNull();
    expect(dto).not.toHaveProperty('raw');
    expect(dto).not.toHaveProperty('openstatesId');
    expect(dto).not.toHaveProperty('criadoEm');
  });

  it('preserva contatos: null na ida e volta (Prisma.DbNull)', async () => {
    // Sem escritórios: o repository traduz `null` → `Prisma.DbNull`. Se essa
    // tradução sumir, o Prisma rejeita a escrita e este teste explode aqui.
    await repository.upsertByOpenstatesId(
      mapPersonToPolitico(viceGovernadoraSemDistrito, 'California'),
    );

    const res = await request(app).get('/api/politicos');

    expect(res.status).toBe(200);
    expect(res.body.data[0].contatos).toBeNull();
    expect(res.body.data[0].distrito).toBeNull(); // cargo executivo, sem distrito
  });

  it('devolve os offices reais como contatos', async () => {
    await repository.upsertByOpenstatesId(mapPersonToPolitico(senadoraCompleta, 'California'));

    const res = await request(app).get('/api/politicos');

    expect(res.body.data[0].contatos).toEqual(senadoraCompleta.offices);
  });

  it('a resposta real casa com o schema PaginatedPoliticos do openapi.json', async () => {
    await semear();
    await repository.upsertByOpenstatesId(mapPersonToPolitico(senadoraCompleta, 'California'));

    const res = await request(app).get('/api/politicos');

    const { ok, erros } = conferirContrato('PaginatedPoliticos', res.body);
    expect(erros).toBe('No errors');
    expect(ok).toBe(true);
  });
});

describe('GET /api/politicos/filtros (Postgres real)', () => {
  it('devolve distinct real, ordenado e sem partido nulo', async () => {
    await semear();

    const res = await request(app).get('/api/politicos/filtros');

    expect(res.status).toBe(200);
    expect(res.body.estados).toEqual(['California', 'Texas']); // distinct + orderBy do banco
    expect(res.body.partidos).toEqual(['Democratic', 'Republican']); // Cid, sem partido, fora
  });

  it('a resposta real casa com o schema Filtros do openapi.json', async () => {
    await semear();

    const res = await request(app).get('/api/politicos/filtros');

    expect(conferirContrato('Filtros', res.body).ok).toBe(true);
  });
});
