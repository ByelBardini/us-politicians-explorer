export interface Office {
  name?: string | null;
  voice?: string | null; // telefone
  fax?: string | null;
  address?: string | null;
  classification?: string | null;
}

export interface Politico {
  id: string;
  nome: string;
  primeiroNome: string | null;
  sobrenome: string | null;
  cargo: string | null;
  camara: string | null; // "upper" | "lower" | "executive"
  distrito: string | null;
  estado: string;
  partido: string | null;
  foto: string | null;
  email: string | null;
  genero: string | null;
  nascimento: string | null; // ISO datetime
  falecimento: string | null; // ISO datetime
  openstatesUrl: string | null;
  contatos: Office[] | null;
  atualizadoEm: string; // ISO datetime
}

export interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface PaginatedPoliticos {
  data: Politico[];
  pagination: Pagination;
}

export interface Filtros {
  estados: string[];
  partidos: string[];
}

export interface ListarParams {
  estado?: string;
  partido?: string;
  q?: string;
  page?: number;
  perPage?: number;
}
