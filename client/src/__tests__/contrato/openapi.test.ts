import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';

import { filtros, paginaDe, politicos } from '../fixtures/politicos';

/**
 * A trava que impede o servidor fingido do MSW de divergir do servidor real.
 *
 * O `openapi.json` é gerado dos mesmos schemas Zod que validam as requests em
 * produção — então validar as fixtures contra ele prende as duas pontas ao mesmo
 * prego: renomear um campo no backend quebra o teste do frontend, que é o ponto.
 *
 * OpenAPI 3.1 é JSON Schema 2020-12; daí o `Ajv2020` em vez do Ajv default.
 */
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const documento = JSON.parse(readFileSync(resolve(raiz, 'server/openapi.json'), 'utf8'));

const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
ajv.addSchema(documento, 'openapi.json');

const validadorDe = (schema: string) => {
  const validar = ajv.getSchema(`openapi.json#/components/schemas/${schema}`);
  if (!validar) throw new Error(`Schema ${schema} não existe no openapi.json.`);
  return validar;
};

/** Erros do Ajv em texto legível — um assert vermelho precisa dizer qual campo. */
const conferir = (schema: string, valor: unknown) => {
  const validar = validadorDe(schema);
  const ok = validar(valor);
  return { ok, erros: ajv.errorsText(validar.errors, { separator: '\n' }) };
};

describe('contrato OpenAPI ↔ fixtures do MSW', () => {
  it('a resposta de /politicos casa com o schema PaginatedPoliticos', () => {
    const { ok, erros } = conferir('PaginatedPoliticos', paginaDe());
    expect(erros).toBe('No errors');
    expect(ok).toBe(true);
  });

  it.each(politicos.map((p) => [p.nome, p] as const))(
    'o político %s casa com o schema Politico',
    (_nome, politico) => {
      const { ok, erros } = conferir('Politico', politico);
      expect(erros).toBe('No errors');
      expect(ok).toBe(true);
    },
  );

  it('a resposta de /politicos/filtros casa com o schema Filtros', () => {
    const { ok, erros } = conferir('Filtros', filtros);
    expect(erros).toBe('No errors');
    expect(ok).toBe(true);
  });

  it('o envelope de erro do backend casa com o schema Erro', () => {
    const { ok } = conferir('Erro', { error: { message: 'Requisição inválida' } });
    expect(ok).toBe(true);
  });

  it('rejeita um político com campo renomeado — o validador tem dentes', () => {
    const { nome, ...semNome } = politicos[0];
    const renomeado = { ...semNome, name: nome };

    // Se este assert virar verde, o teste acima não prova nada: significa que o
    // schema aceita qualquer coisa e a fixture poderia divergir do backend à vontade.
    expect(conferir('Politico', renomeado).ok).toBe(false);
  });
});
