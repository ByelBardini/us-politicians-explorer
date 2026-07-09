/**
 * Tipos da OpenStates API v3, derivados de https://v3.openstates.org/openapi.json.
 *
 * Duas notas do contrato real que moldam o mapper:
 *
 * 1. A API **não usa `null`**: campos sem valor vêm como string vazia
 *    (`district` tem literalmente `default: ""`). Daí o `emptyToNull` no mapper.
 * 2. `offices` só é retornado quando a query inclui `include=offices`.
 *
 * Mesmo com o spec marcando vários campos como `required`, tipamos como
 * opcionais tudo que o mapper tolera ausente: isto aqui é JSON não validado
 * vindo da rede, e só `id`/`name` são realmente indispensáveis.
 */

export type OrgClassification = 'legislature' | 'executive' | 'lower' | 'upper' | 'government';

export type JurisdictionClassification = 'state' | 'municipality' | 'country';

export type PersonInclude = 'other_names' | 'other_identifiers' | 'links' | 'sources' | 'offices';

export interface OpenStatesCurrentRole {
  title?: string | null;
  org_classification?: OrgClassification | null;
  /** Distritos não são só números: existem "At-Large", "Chittenden-6", etc. */
  district?: string | number | null;
  division_id?: string | null;
}

export interface OpenStatesOffice {
  name?: string | null;
  /** O telefone chama-se `voice` no contrato da API, não `phone`. */
  voice?: string | null;
  fax?: string | null;
  address?: string | null;
  classification?: string | null;
}

export interface OpenStatesCompactJurisdiction {
  id: string;
  name: string;
  classification: JurisdictionClassification;
}

export interface OpenStatesPerson {
  id: string;
  name: string;
  party?: string | null;
  current_role?: OpenStatesCurrentRole | null;
  jurisdiction?: OpenStatesCompactJurisdiction | null;
  given_name?: string | null;
  family_name?: string | null;
  image?: string | null;
  email?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  death_date?: string | null;
  openstates_url?: string | null;
  offices?: OpenStatesOffice[] | null;
}

export interface OpenStatesJurisdiction {
  id: string;
  name: string;
  classification: JurisdictionClassification;
}

export interface OpenStatesPagination {
  per_page: number;
  page: number;
  max_page: number;
  total_items: number;
}

export interface OpenStatesPeopleResponse {
  results: OpenStatesPerson[];
  pagination: OpenStatesPagination;
}

export interface OpenStatesJurisdictionsResponse {
  results: OpenStatesJurisdiction[];
  pagination: OpenStatesPagination;
}
