/**
 * Portas e credenciais do E2E **do compose** — a variante que valida o artefato
 * de entrega (as imagens) em vez da stack de desenvolvimento.
 *
 * Nada aqui coincide com o `config.ts` (3100/8081/55433) nem com o dia a dia
 * (3000/8080/5434): as três variantes podem estar no ar ao mesmo tempo, e uma
 * porta compartilhada derrubaria a suíte com um erro que não parece de porta.
 *
 * As credenciais também são próprias: o compose interpola do shell antes do
 * `.env`, então o banco do E2E nasce com estes valores independentemente do que
 * estiver no `.env` da máquina. É o que torna a suíte reprodutível.
 */
export const PROJETO = 'ups-e2e';

export const PORTA_API = 3200;
export const PORTA_WEB = 8082;
export const PORTA_DB = 55434;

export const API_URL = `http://localhost:${PORTA_API}/api`;
export const WEB_URL = `http://localhost:${PORTA_WEB}`;

export const POSTGRES_USER = 'e2e';
export const POSTGRES_PASSWORD = 'e2e';
export const POSTGRES_DB = 'e2e';

/** Do HOST para o Postgres do compose — é por aqui que o seed entra. */
export const DATABASE_URL = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${PORTA_DB}/${POSTGRES_DB}?schema=public`;
