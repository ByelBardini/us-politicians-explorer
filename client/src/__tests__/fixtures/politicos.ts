import type { Filtros, PaginatedPoliticos, Politico } from '../../tipos/politico';

/**
 * Fixtures dos testes — dado falso vive aqui, nunca em `src/api/`.
 *
 * Cada registro existe para exercitar um caso-limite do contrato, não para "ter dado":
 *  - `politicoCompleto`   → todos os campos preenchidos + 2 offices no contato
 *  - `politicoSemFoto`    → `foto: null` (avatar com a inicial)
 *  - `politicoSemPartido` → `partido: null` (dropdown de partido ignora)
 *  - `politicoAtLarge`    → `distrito: "At-Large"` (distrito textual, não numérico)
 *  - `politicoSemContatos`→ `contatos: null` (drawer omite a seção)
 */

export const politicoCompleto: Politico = {
  id: 'ocd-person/0001',
  nome: 'Aisha Wahab',
  primeiroNome: 'Aisha',
  sobrenome: 'Wahab',
  cargo: 'Senator',
  camara: 'upper',
  distrito: '10',
  estado: 'California',
  partido: 'Democratic',
  foto: 'https://www.senate.ca.gov/sites/senate.ca.gov/files/senator_photos/wahab_aisha.jpg',
  email: 'senator.wahab@senate.ca.gov',
  genero: 'Female',
  nascimento: '1978-07-02T00:00:00.000Z',
  falecimento: null,
  openstatesUrl: 'https://openstates.org/person/aisha-wahab-1G1XVDXnCp2Y7tFkVGjxiG/',
  contatos: [
    {
      name: 'Capitol Office',
      fax: '',
      voice: '916-651-4410',
      address: '1021 O St. Suite 8530, Sacramento, CA 95814',
      classification: 'capitol',
    },
    {
      name: 'District Office',
      fax: '',
      voice: '510-794-3900',
      address: '39510 Paseo Padre Parkway Suite 280, Fremont, CA 94538',
      classification: 'district',
    },
  ],
  atualizadoEm: '2026-07-13T10:43:00.000Z',
};

export const politicoSemFoto: Politico = {
  ...politicoCompleto,
  id: 'ocd-person/0002',
  nome: 'Kirsten Engel',
  primeiroNome: 'Kirsten',
  sobrenome: 'Engel',
  cargo: 'Representative',
  camara: 'lower',
  estado: 'Arizona',
  foto: null,
  email: 'kengel@azleg.gov',
  contatos: null,
};

export const politicoSemPartido: Politico = {
  ...politicoCompleto,
  id: 'ocd-person/0003',
  nome: 'Chris Kennedy',
  primeiroNome: 'Chris',
  sobrenome: 'Kennedy',
  estado: 'Texas',
  partido: null,
  contatos: null,
};

export const politicoAtLarge: Politico = {
  ...politicoCompleto,
  id: 'ocd-person/0004',
  nome: 'James Gallagher',
  primeiroNome: 'James',
  sobrenome: 'Gallagher',
  cargo: 'Assemblymember',
  camara: 'lower',
  distrito: 'At-Large',
  estado: 'Texas',
  partido: 'Republican',
  foto: null,
  contatos: null,
};

export const politicos: Politico[] = [
  politicoCompleto,
  politicoSemFoto,
  politicoSemPartido,
  politicoAtLarge,
];

/** Envelope de `GET /politicos` com os defaults do backend (page 1, perPage 20). */
export const paginaDe = (
  itens: Politico[] = politicos,
  paginacao: Partial<PaginatedPoliticos['pagination']> = {},
): PaginatedPoliticos => ({
  data: itens,
  pagination: { page: 1, perPage: 20, total: itens.length, totalPages: 1, ...paginacao },
});

export const filtros: Filtros = {
  estados: ['Arizona', 'California', 'Texas'],
  partidos: ['Democratic', 'Republican'],
};
