import { POLITICOS_MOCK } from './mocks';
import type { Filtros, ListarParams, PaginatedPoliticos } from '../tipos/politico';

/*
 * ⚠️ COSTURA MOCK → BACKEND (Fase 4.1)
 * Hoje estas funções filtram/paginam um array em memória. Para ligar ao backend real,
 * troque APENAS os corpos por fetch a `import.meta.env.VITE_API_URL` — as assinaturas e os
 * tipos já batem com o contrato REST, então nenhum hook/componente muda. Ex.:
 *   const url = new URL(`${import.meta.env.VITE_API_URL}/politicos`);
 *   Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, String(v)));
 *   const res = await fetch(url); if (!res.ok) throw new Error(...); return res.json();
 */

const DELAY_MS = 300; // simula latência p/ exercitar os estados de loading

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function listarPoliticos(params: ListarParams = {}): Promise<PaginatedPoliticos> {
  await espera(DELAY_MS);
  const { estado, partido, q, page = 1, perPage = 20 } = params;

  let itens = POLITICOS_MOCK;
  if (estado) itens = itens.filter((p) => p.estado === estado);
  if (partido) itens = itens.filter((p) => p.partido === partido);
  if (q) {
    const alvo = q.toLowerCase();
    itens = itens.filter((p) => p.nome.toLowerCase().includes(alvo));
  }

  const ordenados = [...itens].sort(
    (a, b) => a.estado.localeCompare(b.estado) || a.nome.localeCompare(b.nome),
  );

  const total = ordenados.length;
  const totalPages = Math.ceil(total / perPage);
  const inicio = (page - 1) * perPage;
  const data = ordenados.slice(inicio, inicio + perPage);

  return { data, pagination: { page, perPage, total, totalPages } };
}

export async function buscarFiltros(): Promise<Filtros> {
  await espera(DELAY_MS);
  const estados = [...new Set(POLITICOS_MOCK.map((p) => p.estado))].sort();
  const partidos = [
    ...new Set(POLITICOS_MOCK.map((p) => p.partido).filter((x): x is string => x != null)),
  ].sort();
  return { estados, partidos };
}
