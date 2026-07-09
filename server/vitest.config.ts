import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Testes vivem só em src/__tests__/, espelhando a árvore de src/.
    // Lógica e teste nunca compartilham pasta.
    include: ['src/__tests__/**/*.test.ts'],
    clearMocks: true,
  },
});
