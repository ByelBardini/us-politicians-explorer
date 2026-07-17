import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { mapPersonToPolitico } from '../../openstates/mapper.js';
import { createPoliticosRepository } from '../../politicos/politicos.repository.js';
import { criarPrisma, limparBanco } from '../helpers/db.js';
import { pessoa } from '../openstates/helpers/respostas.js';

/**
 * 2ª camada de teste: cobre o SQL de verdade — `distinct`, `contains`
 * insensitive, paginação real — que o fake do teste unitário não pega. Isolada
 * da suíte rápida (exige Docker; roda só em `npm run test:integration`).
 */
const prisma = criarPrisma();
const repo = createPoliticosRepository(prisma);

// Cada teste parte de um banco vazio e semeia o que ele mesmo precisa: é o que
// permite rodar qualquer um sozinho (`vitest -t "…"`) sem depender da ordem.
beforeEach(() => limparBanco(prisma));
afterAll(() => prisma.$disconnect());

const semear = async () => {
  await repo.upsertByOpenstatesId(
    mapPersonToPolitico(pessoa('ana', { name: 'Ana Souza', party: 'Democratic' }), 'California'),
  );
  await repo.upsertByOpenstatesId(
    mapPersonToPolitico(pessoa('bob', { name: 'Bob Reis', party: 'Republican' }), 'Texas'),
  );
  await repo.upsertByOpenstatesId(
    mapPersonToPolitico(pessoa('cid', { name: 'Cid Alves' }), 'California'), // sem partido
  );
};

describe('PoliticosRepository (Postgres real)', () => {
  it('filtra por estado e busca por nome (contains insensitive)', async () => {
    await semear();

    const r = await repo.listarPoliticos({
      estado: 'California',
      q: 'ana', // minúsculo: exercita o `mode: insensitive`
      page: 1,
      perPage: 10,
    });

    expect(r.total).toBe(1);
    expect(r.dados[0]!.nome).toContain('Ana');
  });

  it('pagina com skip/take reais', async () => {
    await semear();

    const pagina1 = await repo.listarPoliticos({ page: 1, perPage: 2 });
    const pagina2 = await repo.listarPoliticos({ page: 2, perPage: 2 });

    expect(pagina1.total).toBe(3); // Ana, Bob, Cid
    expect(pagina1.dados).toHaveLength(2);
    expect(pagina2.dados).toHaveLength(1);
    // Sem sobreposição entre as páginas.
    const ids1 = pagina1.dados.map((p) => p.id);
    expect(pagina2.dados.every((p) => !ids1.includes(p.id))).toBe(true);
  });

  it('listarFiltros retorna valores distintos, ordenados e sem partido nulo', async () => {
    await semear();

    const { estados, partidos } = await repo.listarFiltros();

    expect(estados).toEqual(['California', 'Texas']); // ordenados, distintos
    expect(partidos).toEqual(['Democratic', 'Republican']); // Cid (sem partido) descartado
  });
});
