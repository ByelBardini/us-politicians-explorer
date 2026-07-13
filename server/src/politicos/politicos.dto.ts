import type { Politico } from '../generated/prisma/client.js';
import type { PoliticoDTO } from './politicos.schema.js';

/** Datas do Prisma (Date | null) viram string ISO | null no contrato JSON. */
const iso = (d: Date | null): string | null => d?.toISOString() ?? null;

/**
 * Modelo do banco → contrato público. Desacopla o schema da tabela do que a API
 * expõe: seleciona os campos públicos e **omite o `raw`** (payload bruto) e o
 * `openstatesId`/`criadoEm` internos. Datas saem como string ISO.
 */
export const toPoliticoDTO = (p: Politico): PoliticoDTO => ({
  id: p.id,
  nome: p.nome,
  primeiroNome: p.primeiroNome,
  sobrenome: p.sobrenome,
  cargo: p.cargo,
  camara: p.camara,
  distrito: p.distrito,
  estado: p.estado,
  partido: p.partido,
  foto: p.foto,
  email: p.email,
  genero: p.genero,
  nascimento: iso(p.nascimento),
  falecimento: iso(p.falecimento),
  openstatesUrl: p.openstatesUrl,
  contatos: p.contatos ?? null,
  atualizadoEm: p.atualizadoEm.toISOString(),
});
