/**
 * Cliente HTTP da API. Única porta de saída do frontend para a rede: monta a URL
 * a partir de `VITE_API_URL`, serializa a query string e traduz o envelope de erro
 * do backend (`{ error: { message, details? } }`) num `ApiError` tipado.
 *
 * Concentrar isto aqui é o que deixa `api/politicos.ts` legível (uma linha por
 * endpoint) e o que dá aos hooks um erro com `message` de verdade para exibir.
 */

/** Erro de resposta da API. Carrega o `status` para a UI decidir o que dizer. */
export class ApiError extends Error {
  // Campos atribuídos no corpo, não como parameter properties: o tsconfig usa
  // `erasableSyntaxOnly` (o Vite só apaga tipos, não gera código a partir deles).
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export type QueryValue = string | number | boolean | undefined | null;

/** Rede caiu / DNS falhou / CORS bloqueou: não há status HTTP nenhum. */
const SEM_RESPOSTA = 0;
const TIMEOUT_MS = 10_000;

const montarUrl = (caminho: string, query: Record<string, QueryValue>): string => {
  const base = import.meta.env.VITE_API_URL.replace(/\/$/, '');
  const url = new URL(`${base}${caminho}`);
  // `undefined`/`null` são "sem filtro", não o texto "undefined": omitir é o que
  // faz o backend aplicar os defaults do Zod em vez de rejeitar a query.
  for (const [chave, valor] of Object.entries(query)) {
    if (valor !== undefined && valor !== null) url.searchParams.set(chave, String(valor));
  }
  return url.toString();
};

/**
 * Lê a mensagem do envelope de erro. Um 500 pode vir sem corpo (ou com HTML de
 * proxy), então `.json()` fica dentro do try: falhar ao parsear o erro não pode
 * virar um erro diferente do que o servidor de fato devolveu.
 */
const mensagemDoErro = async (res: Response): Promise<{ message: string; details?: unknown }> => {
  try {
    const corpo = (await res.json()) as { error?: { message?: string; details?: unknown } };
    if (corpo?.error?.message)
      return { message: corpo.error.message, details: corpo.error.details };
  } catch {
    /* corpo ausente ou não-JSON: cai no genérico abaixo */
  }
  return { message: `Erro ${res.status} ao consultar a API.` };
};

/** Núcleo compartilhado de apiGet/apiPost: fetch + tradução de erro + parse. */
async function executar<T>(url: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (erro) {
    // `fetch` só rejeita quando não houve resposta (rede/abort). Traduzimos para
    // `ApiError` aqui para que os hooks nunca vejam dois tipos de falha.
    const causa = erro instanceof Error ? erro.message : String(erro);
    throw new ApiError(SEM_RESPOSTA, `Não foi possível conectar à API (${causa}).`);
  }

  if (!res.ok) {
    const { message, details } = await mensagemDoErro(res);
    throw new ApiError(res.status, message, details);
  }

  return (await res.json()) as T;
}

export function apiGet<T>(caminho: string, query: Record<string, QueryValue> = {}): Promise<T> {
  return executar<T>(montarUrl(caminho, query), {
    headers: { Accept: 'application/json' },
  });
}

export function apiPost<T>(caminho: string, body: unknown = {}): Promise<T> {
  return executar<T>(montarUrl(caminho, {}), {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
