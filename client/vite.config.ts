import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 8080 },
  preview: { port: 8080 },
  test: {
    environment: 'jsdom',
    setupFiles: './src/teste/setup.ts',
    // A URL da API nos testes é fixa e não-resolvível de propósito: quem responde
    // é o MSW, e qualquer requisição que escape da interceptação falha alto.
    env: { VITE_API_URL: 'http://api.teste.local/api' },
  },
});
