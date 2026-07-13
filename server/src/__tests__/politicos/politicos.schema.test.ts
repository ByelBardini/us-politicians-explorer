import { describe, expect, it } from 'vitest';

import { politicosQuerySchema, syncBodySchema } from '../../politicos/politicos.schema.js';

describe('politicosQuerySchema', () => {
  it('aplica defaults de page/perPage', () => {
    expect(politicosQuerySchema.parse({})).toMatchObject({ page: 1, perPage: 20 });
  });

  it('faz coerce de query string para número', () => {
    expect(politicosQuerySchema.parse({ page: '3' }).page).toBe(3);
  });

  it('rejeita perPage acima de 100', () => {
    expect(politicosQuerySchema.safeParse({ perPage: '500' }).success).toBe(false);
  });

  it('rejeita page abaixo de 1', () => {
    expect(politicosQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });

  it('trata estado vazio como ausente', () => {
    expect(politicosQuerySchema.parse({ estado: '' }).estado).toBeUndefined();
  });

  it('faz trim de q e mantém o valor', () => {
    expect(politicosQuerySchema.parse({ q: '  Maria  ' }).q).toBe('Maria');
  });
});

describe('syncBodySchema', () => {
  it('aceita body vazio (estados opcional)', () => {
    expect(syncBodySchema.parse({})).toEqual({});
  });

  it('aceita lista de estados', () => {
    expect(syncBodySchema.parse({ estados: ['California'] })).toEqual({
      estados: ['California'],
    });
  });

  it('rejeita estados que não é array de strings', () => {
    expect(syncBodySchema.safeParse({ estados: 'nope' }).success).toBe(false);
  });
});
