import { execSync } from 'node:child_process';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

/**
 * `globalSetup` da suíte de integração: **um** container Postgres para todos os
 * arquivos.
 *
 * Um container por arquivo custaria ~5 s cada e não compraria isolamento nenhum
 * de verdade — o isolamento real é o `limparBanco()` do `beforeEach` (ver `db.ts`),
 * que além de mais rápido é o que garante que cada teste passe sozinho.
 */
declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

let container: StartedPostgreSqlContainer | undefined;

export async function setup(project: TestProject) {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  const databaseUrl = container.getConnectionUri();

  // `migrate deploy` (não `dev`) é o certo para um banco efêmero: aplica as
  // migrações existentes, sem prompts nem geração de novas.
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });

  // Os testes rodam em workers separados; `provide` é o canal para a URL chegar
  // até eles (um `export` não atravessaria o limite de processo).
  project.provide('databaseUrl', databaseUrl);
}

export async function teardown() {
  await container?.stop();
}
