import { describe, expect, it } from 'vitest';
import { buscarFiltros, listarPoliticos } from '../../api/politicos';

describe('listarPoliticos (mock)', () => {
  it('filtra por estado (match exato)', async () => {
    const { data } = await listarPoliticos({ estado: 'California' });
    expect(data.length).toBeGreaterThan(0);
    expect(data.every((p) => p.estado === 'California')).toBe(true);
  });

  it('busca por nome é case-insensitive', async () => {
    const { data } = await listarPoliticos({ q: 'aisha' });
    expect(data.some((p) => p.nome.includes('Aisha'))).toBe(true);
  });

  it('pagina e calcula totalPages', async () => {
    const r = await listarPoliticos({ page: 1, perPage: 5 });
    expect(r.data.length).toBeLessThanOrEqual(5);
    expect(r.pagination.totalPages).toBe(Math.ceil(r.pagination.total / 5));
  });
});

describe('buscarFiltros (mock)', () => {
  it('devolve estados e partidos distintos e ordenados', async () => {
    const { estados, partidos } = await buscarFiltros();
    expect(estados).toEqual([...estados].sort());
    expect(new Set(estados).size).toBe(estados.length);
    expect(partidos).not.toContain(null);
  });
});
