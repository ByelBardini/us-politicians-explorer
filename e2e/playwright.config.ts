import { defineConfig, devices } from '@playwright/test';

import { API_URL, DATABASE_URL, PORTA_API, PORTA_WEB, WEB_URL } from './config.js';

/**
 * E2E: navegador real → React real → HTTP → Express → Prisma → Postgres real.
 * Zero mocks — é a prova final de que as pontas que os testes rápidos costuram
 * com MSW e fixtures realmente se encaixam.
 *
 * Na Fase 5 o `webServer` é reapontado para a stack do `docker compose` e este
 * mesmo spec passa a validar os containers.
 */
export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  reporter: process.env.CI ? 'line' : 'list',
  use: { baseURL: WEB_URL, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Sobe e semeia o Postgres; o retorno dele derruba o container no fim.
  globalSetup: './global-setup.ts',

  webServer: [
    {
      command: 'npm run dev',
      cwd: '../server', // relativo ao diretório deste config
      url: `http://localhost:${PORTA_API}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        DATABASE_URL,
        BACKEND_PORT: String(PORTA_API),
        CORS_ORIGIN: WEB_URL,
        OPENSTATES_API_KEY: 'nao-usada-no-e2e', // o env exige; nenhum sync roda aqui
        SYNC_ON_STARTUP: 'false', // gastaria cota de verdade
        SYNC_SCHEDULE_ENABLED: 'false',
      },
    },
    {
      command: `npm run dev -- --port ${PORTA_WEB} --strictPort`,
      cwd: '../client',
      url: WEB_URL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { VITE_API_URL: API_URL },
    },
  ],
});
