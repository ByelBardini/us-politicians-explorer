import { defineConfig, devices } from '@playwright/test';

import { WEB_URL } from './config.compose.js';

/**
 * E2E contra a stack do `docker compose` — as **imagens de entrega**.
 *
 * Roda o mesmo spec do `playwright.config.ts`, sem uma linha de diferença: o
 * que muda é só de onde a stack vem. Lá são `vite dev` + `tsx` + Testcontainers
 * (~15 s, cabe em cada push do CI); aqui é nginx servindo o bundle buildado e o
 * `node dist/index.js` atrás do entrypoint que aplica as migrations.
 *
 * Os dois existem porque provam coisas diferentes. Este pega o que o outro não
 * pode pegar: um `VITE_API_URL` assado errado, um estágio do Dockerfile que não
 * copiou o que devia, uma migration que não roda no boot. Em troca, builda
 * imagens e leva minutos — daí ficar fora do CI de push e rodar a mão ou em
 * release.
 */
export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  reporter: process.env.CI ? 'line' : 'list',
  use: { baseURL: WEB_URL, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Sobe o compose, semeia e derruba no fim. Sem `webServer`: quem serve são os
  // containers, não um processo de dev que o Playwright gerencia.
  globalSetup: './global-setup.compose.ts',

  // O build das imagens no primeiro `up` estoura qualquer default.
  globalTimeout: 15 * 60 * 1000,
});
