/**
 * Portas e URLs do E2E, num lugar só — o `playwright.config.ts` e o
 * `global-setup.ts` precisam concordar sobre elas.
 *
 * Nenhuma coincide com as de desenvolvimento (3000/8080/5432/5434): o E2E sobe a
 * stack inteira do zero e não pode brigar com um `npm run dev` no ar, nem ler o
 * banco dele.
 */
export const PORTA_API = 3100;
export const PORTA_WEB = 8081;
// Bem fora da faixa usual do Postgres (5432–5435): máquinas de dev costumam ter
// mais de um banco no ar, e uma porta ocupada aqui derruba a suíte inteira.
export const PORTA_DB = 55433;

export const API_URL = `http://localhost:${PORTA_API}/api`;
export const WEB_URL = `http://localhost:${PORTA_WEB}`;
export const DATABASE_URL = `postgresql://e2e:e2e@localhost:${PORTA_DB}/e2e?schema=public`;
