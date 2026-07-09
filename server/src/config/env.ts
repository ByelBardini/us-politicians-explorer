import { z } from 'zod';

/**
 * Validação das variáveis de ambiente, com falha rápida no boot.
 *
 * `parseEnv` é puro: lê só a fonte recebida (default `process.env`), nunca o
 * ambiente global por baixo dos panos. Isso mantém os testes independentes do
 * shell e do `.env` da máquina.
 */

export class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvValidationError';
    Object.setPrototypeOf(this, EnvValidationError.prototype);
  }
}

/**
 * `SYNC_SCHEDULE_ENABLED` e `SYNC_ON_STARTUP` usam `z.stringbool()`, não
 * `z.coerce.boolean()`: este último considera qualquer string não-vazia como
 * `true` — inclusive `"false"`, que ligaria o sync silenciosamente.
 */
const envSchema = z.object({
  OPENSTATES_API_KEY: z.string().min(1),
  OPENSTATES_BASE_URL: z.url().default('https://v3.openstates.org'),
  DATABASE_URL: z.string().min(1),

  BACKEND_PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:8080'),

  // Vazio = todos os estados (a lista canônica vem de GET /jurisdictions).
  SYNC_STATES: z
    .string()
    .optional()
    .transform((bruto) =>
      (bruto ?? '')
        .split(',')
        .map((estado) => estado.trim())
        .filter(Boolean),
    ),
  SYNC_PER_PAGE: z.coerce.number().int().positive().default(50),
  SYNC_REQUEST_DELAY_MS: z.coerce.number().int().nonnegative().default(1100),

  // Opt-in: cada `docker compose up` em dev gastaria a cota de um sync inteiro.
  SYNC_SCHEDULE_ENABLED: z.stringbool().default(false),
  SYNC_ON_STARTUP: z.stringbool().default(false),
  SYNC_CRON: z.string().min(1).default('0 3 * * *'),
  SYNC_CRON_TIMEZONE: z.string().min(1).default('America/Sao_Paulo'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Trata `VAR=` como ausente. O docker-compose injeta string vazia quando a
 * variável não está preenchida no `.env`, e queremos que o default valha.
 * Nas obrigatórias o efeito é o desejado: vazio falha igual a faltando.
 */
const semValoresVazios = (fonte: Record<string, string | undefined>): Record<string, string> => {
  const limpa: Record<string, string> = {};
  for (const [chave, valor] of Object.entries(fonte)) {
    if (valor !== undefined && valor !== '') limpa[chave] = valor;
  }
  return limpa;
};

export function parseEnv(fonte: Record<string, string | undefined> = process.env): Env {
  const resultado = envSchema.safeParse(semValoresVazios(fonte));

  if (!resultado.success) {
    throw new EnvValidationError(
      `Variáveis de ambiente inválidas:\n${z.prettifyError(resultado.error)}`,
    );
  }

  return resultado.data;
}
