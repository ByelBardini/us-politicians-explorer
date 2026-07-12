import type { OpenStatesPerson } from '../../../openstates/types.js';

/**
 * Fixtures copiados de uma resposta REAL de
 * `GET /people?jurisdiction=California&per_page=50&include=offices` (2026-07).
 *
 * O que os 50 registros daquela página revelaram, e que suposição nenhuma teria
 * acertado:
 *
 * - A API **não usa `null`**: ausência é string vazia. `death_date` veio `""`
 *   em 50/50, `birth_date` em 13/50, e `district`/`image`/`email`/`gender` em
 *   1/50 cada. Passar `""` para `new Date()` daria `Invalid Date` no banco.
 * - `org_classification` não é só `upper`/`lower`: há `executive` (Lt. Governor),
 *   que vem sem distrito.
 * - `district` chegou sempre como string, mas o contrato admite integer.
 */

/** Senadora: caso completo — todos os campos preenchidos, dois escritórios. */
export const senadoraCompleta: OpenStatesPerson = {
  id: 'ocd-person/295965df-6c71-4e11-806f-2b7d5be5d45c',
  name: 'Aisha Wahab',
  party: 'Democratic',
  current_role: {
    title: 'Senator',
    org_classification: 'upper',
    district: '10',
    division_id: 'ocd-division/country:us/state:ca/sldu:10',
  },
  jurisdiction: {
    id: 'ocd-jurisdiction/country:us/state:ca/government',
    name: 'California',
    classification: 'state',
  },
  given_name: 'Aisha',
  family_name: 'Wahab',
  image: 'https://www.senate.ca.gov/sites/senate.ca.gov/files/senator_photos/wahab_aisha.jpg',
  email: 'senator.wahab@senate.ca.gov',
  gender: 'Female',
  birth_date: '1978-07-02',
  death_date: '',
  openstates_url: 'https://openstates.org/person/aisha-wahab-1G1XVDXnCp2Y7tFkVGjxiG/',
  offices: [
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
};

/**
 * Lt. Governor: cargo executivo, sem distrito. `district`, `email`, `gender`,
 * `birth_date` e `death_date` chegam todos como string vazia.
 */
export const viceGovernadoraSemDistrito: OpenStatesPerson = {
  id: 'ocd-person/113aeeca-7bac-4407-8ec3-bceab97680e5',
  name: 'Eleni Kounalakis',
  party: 'Democratic',
  current_role: {
    title: 'Lt_Governor',
    org_classification: 'executive',
    district: '',
    division_id: '',
  },
  jurisdiction: {
    id: 'ocd-jurisdiction/country:us/state:ca/government',
    name: 'California',
    classification: 'state',
  },
  given_name: 'Eleni',
  family_name: 'Kounalakis',
  image: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Ambassador_Eleni_Kounalakis.jpeg',
  email: '',
  gender: '',
  birth_date: '',
  death_date: '',
  openstates_url: 'https://openstates.org/person/eleni-kounalakis-6MOJfxNKM4iVYrZ5oIYSoT/',
  offices: [],
};

/** Deputada sem foto: `image` vazia, mas com e-mail. */
export const deputadaSemFoto: OpenStatesPerson = {
  id: 'ocd-person/8f7d0c4e-1234-4c9a-9f1e-abc123456789',
  name: 'Jasmeet Bains',
  party: 'Democratic',
  current_role: {
    title: 'Assemblymember',
    org_classification: 'lower',
    district: '35',
  },
  jurisdiction: {
    id: 'ocd-jurisdiction/country:us/state:ca/government',
    name: 'California',
    classification: 'state',
  },
  given_name: 'Jasmeet',
  family_name: 'Bains',
  image: '',
  email: 'assemblymember.bains@assembly.ca.gov',
  gender: 'Female',
  birth_date: '',
  death_date: '',
  openstates_url: 'https://openstates.org/person/jasmeet-bains-4kL9mNpQrStUvWxYz/',
  offices: [
    {
      name: 'Capitol Office',
      fax: '',
      voice: '916-319-2035',
      address: '1021 O Street, Sacramento, CA 95814',
      classification: 'capitol',
    },
  ],
};
