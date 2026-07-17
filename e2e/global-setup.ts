import { execSync } from 'node:child_process';
import path from 'node:path';

import { PostgreSqlContainer } from '@testcontainers/postgresql';

import { DATABASE_URL, PORTA_DB } from './config.js';

/**
 * O Playwright carrega estes arquivos como CommonJS (a raiz do repo não é ESM),
 * então nada de `import.meta.url` aqui — daí o `__dirname`.
 */
const dirServer = path.resolve(__dirname, '../server');
const seed = path.resolve(__dirname, 'seed.mts');

/**
 * Sobe o Postgres do E2E e o semeia antes dos testes.
 *
 * A porta do host é **fixa** (ver `config.ts`), e não sorteada como o
 * Testcontainers faria por padrão. O motivo é a ordem: o Playwright inicia o
 * `webServer` sem esperar por este arquivo, então a `DATABASE_URL` precisa ser
 * conhecida antes de qualquer coisa subir. O backend abre conexão preguiçosamente
 * (só no primeiro query), então ele tolera bootar antes do banco existir.
 */
export default async function globalSetup() {
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('e2e')
    .withUsername('e2e')
    .withPassword('e2e')
    .withExposedPorts({ container: 5432, host: PORTA_DB })
    .start();

  execSync('npx prisma migrate deploy', {
    cwd: dirServer,
    env: { ...process.env, DATABASE_URL },
    stdio: 'inherit',
  });

  // Em processo separado, via tsx: o seed usa o client do Prisma (ESM puro), que
  // não sobrevive à transpilação para CommonJS que o Playwright faz aqui.
  execSync(`npx tsx "${seed}"`, {
    env: { ...process.env, DATABASE_URL },
    stdio: 'inherit',
  });

  // O Playwright chama o retorno do globalSetup como teardown.
  return async () => {
    await container.stop();
  };
}
