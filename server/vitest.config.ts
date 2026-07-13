import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Testes vivem só em src/__tests__/, espelhando a árvore de src/.
    // Lógica e teste nunca compartilham pasta.
    include: ['src/__tests__/**/*.test.ts'],
    // A suíte de integração (Postgres real via Docker) é isolada em
    // vitest.integration.config.ts — nunca roda no `npm test`.
    exclude: [...configDefaults.exclude, '**/*.integration.test.ts'],
    clearMocks: true,
  },
});
