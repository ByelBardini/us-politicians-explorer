import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Testes vivem só em src/__tests__/, espelhando a árvore de src/.
    // Lógica e teste nunca compartilham pasta.
    include: ['src/__tests__/**/*.test.ts'],
    // As suítes que exigem I/O real são isoladas em configs próprias e NUNCA
    // rodam no `npm test`: integração (Postgres via Docker) em
    // vitest.integration.config.ts, e o smoke ao vivo (gasta cota da OpenStates)
    // em vitest.live.config.ts.
    exclude: [...configDefaults.exclude, '**/*.integration.test.ts', '**/*.live.test.ts'],
    clearMocks: true,
  },
});
