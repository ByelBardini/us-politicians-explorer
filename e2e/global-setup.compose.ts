import { execFileSync } from 'node:child_process';
import path from 'node:path';

import {
  API_URL,
  DATABASE_URL,
  PORTA_API,
  PORTA_DB,
  PORTA_WEB,
  POSTGRES_DB,
  POSTGRES_PASSWORD,
  POSTGRES_USER,
  PROJETO,
  WEB_URL,
} from './config.compose.js';

/**
 * Sobe a stack do `docker compose` e a semeia — o `webServer` do Playwright não
 * é usado aqui: quem serve é container, não `vite dev`.
 *
 * Como no `global-setup.ts`, o Playwright carrega este arquivo como CommonJS
 * (a raiz do repo não é ESM), então nada de `import.meta.url` — daí o `__dirname`.
 */
const raiz = path.resolve(__dirname, '..');
const seed = path.resolve(__dirname, 'seed.mts');

const compose = [
  'compose',
  '-p',
  PROJETO,
  '-f',
  'docker-compose.yml',
  '-f',
  'docker-compose.e2e.yml',
];

/**
 * O compose lê estas variáveis do shell ANTES do `.env` da raiz, e é isso que
 * torna a rodada reprodutível: as portas e o banco do E2E não mudam conforme a
 * máquina de quem roda.
 */
const ambiente = {
  ...process.env,
  BACKEND_PORT: String(PORTA_API),
  WEB_PORT: String(PORTA_WEB),
  POSTGRES_HOST_PORT: String(PORTA_DB),
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_DB,
  // O Vite assa esta URL no bundle em build-time: tem de ser a porta que ESTE
  // projeto publica, não a 3000 do dia a dia.
  VITE_API_URL: API_URL,
};

export default async function globalSetup() {
  // `--wait` bloqueia até o healthcheck do server passar, o que só acontece
  // depois do entrypoint aplicar as migrations. Sem ele, o seed correria contra
  // um banco ainda sem tabela.
  //
  // `--build` é o ponto da suíte: o que sobe aqui são as imagens de entrega,
  // não `tsx`/`vite dev`. É lento (minutos) — por isso esta suíte vive fora do
  // CI de push.
  console.log(`E2E compose: subindo a stack (${WEB_URL})...`);
  execFileSync('docker', [...compose, 'up', '--build', '-d', '--wait'], {
    cwd: raiz,
    env: ambiente,
    stdio: 'inherit',
  });

  // Em processo separado, via tsx, pelo mesmo motivo do global-setup.ts: o
  // client do Prisma é ESM puro e não sobrevive à transpilação para CommonJS.
  //
  // As migrations já rodaram — quem as aplicou foi o entrypoint do container,
  // que é justamente um dos comportamentos que esta suíte existe para provar.
  execFileSync('npx', ['tsx', seed], {
    cwd: raiz,
    env: { ...ambiente, DATABASE_URL },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  // O Playwright chama o retorno como teardown. `-v` leva o volume junto: sem
  // isso a semente da rodada anterior sobreviveria e mascararia uma falha de
  // migration na próxima.
  return async () => {
    execFileSync('docker', [...compose, 'down', '-v'], {
      cwd: raiz,
      env: ambiente,
      stdio: 'inherit',
    });
  };
}
