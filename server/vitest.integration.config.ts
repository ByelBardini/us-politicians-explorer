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
    // Um container para toda a suíte: sobe uma vez, aplica as migrations e
    // publica a URL via `provide`. O isolamento fica com o `limparBanco()`.
    globalSetup: ['./src/__tests__/helpers/postgres.global.ts'],
    // Um banco só ⇒ os arquivos NÃO podem rodar em paralelo: o `limparBanco()` de
    // um apagaria as linhas que o outro acabou de semear. Serializar custa poucos
    // segundos; o container único economiza ~5 s por arquivo.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
