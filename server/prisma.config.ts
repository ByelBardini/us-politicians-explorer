import 'dotenv/config'; // carrega server/.env em process.env (usado pela CLI do Prisma no host)
import { defineConfig, env } from 'prisma/config';

// Config da CLI do Prisma 7. A `datasource.url` aqui é o que o Prisma Migrate usa.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
