import { inject } from 'vitest';

import { createPrismaClient } from '../../lib/prisma.js';

/**
 * Acesso ao Postgres do `globalSetup` (ver `postgres.global.ts`) a partir de um
 * arquivo de teste. Um client por arquivo; lembre do `$disconnect` no `afterAll`.
 */
export const criarPrisma = () => createPrismaClient(inject('databaseUrl'));

/**
 * Isolamento entre testes. Cada teste semeia o que ele mesmo precisa e começa de
 * um banco vazio — sem isso a suíte depende da ordem de execução, e rodar um teste
 * isolado (`vitest -t`) quebra.
 */
export const limparBanco = async (prisma: ReturnType<typeof criarPrisma>) => {
  await prisma.politico.deleteMany();
};
