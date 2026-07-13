import { defineConfig } from 'vitest/config';

/**
 * Suíte de integração — isolada da rápida (`npm test`). Sobe Postgres real via
 * Testcontainers, então exige Docker e tem timeouts folgados (subir container
 * demora). NÃO roda no `npm test`; use `npm run test:integration`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.integration.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
