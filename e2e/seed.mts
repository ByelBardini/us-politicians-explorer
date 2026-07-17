import { createPrismaClient } from '../server/src/lib/prisma.js';
import { mapPersonToPolitico } from '../server/src/openstates/mapper.js';
import type { OpenStatesPerson } from '../server/src/openstates/types.js';
import { createPoliticosRepository } from '../server/src/politicos/politicos.repository.js';

/**
 * Semeia o Postgres do E2E.
 *
 * O dado passa pelo **mapper de produção** — o mesmo código que o sync usa — a
 * partir de payloads no formato real da OpenStates. Assim a forma do que chega
 * ao banco é idêntica à de um sync de verdade, sem gastar uma requisição da cota.
 *
 * Roda como **script próprio** (`tsx e2e/seed.mts`), disparado pelo `global-setup`.
 * Não é importado por ele de propósito: o Playwright carrega seus arquivos como
 * CommonJS, e o client do Prisma é ESM puro — importá-lo de lá quebraria. A
 * extensão `.mts` é o que garante ESM sem depender do `package.json` da raiz.
 */

/** Payload real: senadora com foto, partido, distrito e dois escritórios. */
const senadora: OpenStatesPerson = {
  id: 'ocd-person/e2e-0001',
  name: 'Aisha Wahab',
  party: 'Democratic',
  current_role: { title: 'Senator', org_classification: 'upper', district: '10' },
  jurisdiction: {
    id: 'ocd-jurisdiction/country:us/state:ca/government',
    name: 'California',
    classification: 'state',
  },
  given_name: 'Aisha',
  family_name: 'Wahab',
  // Data URI: o E2E não pode depender de uma foto hospedada por terceiro estar
  // no ar — a asserção é "a foto renderiza", não "o CDN da Califórnia responde".
  image:
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iIzFkNGVkOCIvPjwvc3ZnPg==',
  email: 'senator.wahab@senate.ca.gov',
  gender: 'Female',
  birth_date: '1978-07-02',
  death_date: '', // a API manda string vazia, não null — o mapper traduz
  openstates_url: 'https://openstates.org/person/aisha-wahab-e2e/',
  offices: [
    {
      name: 'Capitol Office',
      fax: '',
      voice: '916-651-4410',
      address: '1021 O St. Suite 8530, Sacramento, CA 95814',
      classification: 'capitol',
    },
  ],
};

/** Mesma jurisdição, outro partido: dá o que filtrar dentro da California. */
const deputado: OpenStatesPerson = {
  ...senadora,
  id: 'ocd-person/e2e-0002',
  name: 'James Gallagher',
  party: 'Republican',
  current_role: { title: 'Assemblymember', org_classification: 'lower', district: '3' },
  given_name: 'James',
  family_name: 'Gallagher',
  image: '', // sem foto: o card cai no avatar com a inicial
  email: '',
  offices: [],
};

/** Outro estado: dá o que filtrar por estado. */
const senadoraTexas: OpenStatesPerson = {
  ...senadora,
  id: 'ocd-person/e2e-0003',
  name: 'Carol Alvarado',
  party: 'Democratic',
  current_role: { title: 'Senator', org_classification: 'upper', district: '6' },
  jurisdiction: {
    id: 'ocd-jurisdiction/country:us/state:tx/government',
    name: 'Texas',
    classification: 'state',
  },
  given_name: 'Carol',
  family_name: 'Alvarado',
};

/** Volume suficiente para a paginação ter uma segunda página (perPage = 12). */
const extras: OpenStatesPerson[] = Array.from({ length: 12 }, (_, i) => ({
  ...senadora,
  id: `ocd-person/e2e-extra-${i}`,
  name: `Zelda Extra ${String(i).padStart(2, '0')}`,
  given_name: 'Zelda',
  family_name: `Extra ${i}`,
  party: i % 2 === 0 ? 'Democratic' : 'Republican',
  image: '',
  offices: [],
}));

export const PESSOAS: OpenStatesPerson[] = [senadora, deputado, senadoraTexas, ...extras];

export async function semear(databaseUrl: string): Promise<void> {
  const prisma = createPrismaClient(databaseUrl);
  const repository = createPoliticosRepository(prisma);

  try {
    await prisma.politico.deleteMany();
    for (const pessoa of PESSOAS) {
      await repository.upsertByOpenstatesId(
        mapPersonToPolitico(pessoa, pessoa.jurisdiction?.name ?? 'California'),
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória para semear o E2E.');

await semear(databaseUrl);
console.log(`E2E: ${PESSOAS.length} políticos semeados.`);
