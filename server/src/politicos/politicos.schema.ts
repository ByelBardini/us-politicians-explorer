import { z } from 'zod';

/**
 * Fonte única de verdade dos contratos da API: estes schemas validam a request
 * **e** alimentam o OpenAPI (T10, via `.meta()`). Nada de segunda fonte.
 */

/**
 * Filtro textual opcional: string na query é sempre texto, então tratamos
 * `''`/whitespace como ausente (o `z.preprocess`) antes de validar. Sem isso,
 * `?estado=` (vazio) viraria erro em vez de "sem filtro".
 */
const filtroOpcional = (meta: { description: string; example?: string }) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().trim().min(1).optional(),
  ).meta(meta);

export const politicosQuerySchema = z.object({
  estado: filtroOpcional({ description: 'Filtra por estado (nome exato).', example: 'California' }),
  partido: filtroOpcional({ description: 'Filtra por partido.', example: 'Democratic' }),
  q: filtroOpcional({ description: 'Busca por nome (case-insensitive).', example: 'Maria' }),
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1)
    .meta({ description: 'Página (1-based).' }),
  perPage: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .meta({ description: 'Itens por página (máx. 100).' }),
});
export type PoliticosQuery = z.infer<typeof politicosQuerySchema>;

/**
 * Político no formato público. Espelha as colunas do modelo, MENOS o `raw`
 * (payload bruto da OpenStates) — o contrato não vaza dados internos. Datas
 * saem como string ISO (JSON não tem tipo Date).
 */
export const politicoDTOSchema = z
  .object({
    id: z.string(),
    nome: z.string(),
    primeiroNome: z.string().nullable(),
    sobrenome: z.string().nullable(),
    cargo: z.string().nullable(),
    camara: z.string().nullable(),
    distrito: z.string().nullable(),
    estado: z.string(),
    partido: z.string().nullable(),
    foto: z.string().nullable(),
    email: z.string().nullable(),
    genero: z.string().nullable(),
    nascimento: z.string().nullable(),
    falecimento: z.string().nullable(),
    openstatesUrl: z.string().nullable(),
    contatos: z.unknown().nullable(),
    atualizadoEm: z.string(),
  })
  .meta({ id: 'Politico', description: 'Político no formato público (sem o payload bruto).' });
export type PoliticoDTO = z.infer<typeof politicoDTOSchema>;

export const paginatedPoliticosSchema = z
  .object({
    data: z.array(politicoDTOSchema),
    pagination: z.object({
      page: z.number(),
      perPage: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
  })
  .meta({ id: 'PaginatedPoliticos' });

export const filtrosResponseSchema = z
  .object({ estados: z.array(z.string()), partidos: z.array(z.string()) })
  .meta({ id: 'Filtros' });

export const syncBodySchema = z.object({
  estados: z.array(z.string().min(1)).optional(),
});

export const syncAceitoSchema = z
  .object({ status: z.literal('accepted'), message: z.string() })
  .meta({ id: 'SyncAceito' });

export const erroSchema = z
  .object({
    error: z.object({ message: z.string(), details: z.unknown().optional() }),
  })
  .meta({ id: 'Erro' });
