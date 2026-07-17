import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

// A chave vive no `.env` da raiz (o mesmo que o docker-compose injeta).
config({ path: ['../.env', '.env'], quiet: true });

/**
 * Smoke ao vivo — a única suíte que gasta cota da OpenStates (1 requisição).
 * Isolada da rápida e da integração, e **opt-in**: sem `RUN_LIVE_API=1` os testes
 * são pulados. Fora do CI de propósito.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.live.test.ts'],
    // Repassado explicitamente: o worker não herda o que o `dotenv` carregou aqui.
    env: {
      OPENSTATES_API_KEY: process.env.OPENSTATES_API_KEY ?? '',
      OPENSTATES_BASE_URL: process.env.OPENSTATES_BASE_URL ?? '',
      RUN_LIVE_API: process.env.RUN_LIVE_API ?? '',
    },
    testTimeout: 30_000, // rede real
  },
});
