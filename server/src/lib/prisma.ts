import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Cliente do Prisma.
 *
 * O Prisma 7 gera o client em modo query-compiler (WASM), sem o binary engine
 * antigo: `new PrismaClient()` **exige** um driver adapter. Daí o `@prisma/adapter-pg`
 * — sem ele, o client nem instancia.
 *
 * Instanciar não abre conexão (ela é preguiçosa, no primeiro query), então o
 * boot funciona mesmo com o banco fora do ar.
 */
export function createPrismaClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/**
 * O `tsx watch` recarrega o módulo a cada save; sem guardar a instância no
 * `globalThis`, cada reload abriria um novo pool e o Postgres esgotaria as
 * conexões em minutos de desenvolvimento.
 */
const globalComPrisma = globalThis as typeof globalThis & { __prisma?: PrismaClient };

export const prisma: PrismaClient = (globalComPrisma.__prisma ??= createPrismaClient(
  process.env.DATABASE_URL ?? '',
));
