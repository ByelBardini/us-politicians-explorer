import { describe, expect, it } from 'vitest';
import { corDoPartido } from '../../utilitarios/partido';

describe('corDoPartido', () => {
  it('mapeia Democratic para o tom dem', () => {
    expect(corDoPartido('Democratic').tom).toBe('dem');
  });

  it('mapeia variações como Democratic-Farmer-Labor para dem', () => {
    expect(corDoPartido('Democratic-Farmer-Labor').tom).toBe('dem');
  });

  it('mapeia Republican para o tom rep', () => {
    expect(corDoPartido('Republican').tom).toBe('rep');
  });

  it('mapeia partidos terceiros para o tom outro', () => {
    expect(corDoPartido('Libertarian').tom).toBe('outro');
  });

  it('mapeia null e undefined para o tom outro', () => {
    expect(corDoPartido(null).tom).toBe('outro');
    expect(corDoPartido(undefined).tom).toBe('outro');
  });

  it('é case-insensitive', () => {
    expect(corDoPartido('REPUBLICAN').tom).toBe('rep');
    expect(corDoPartido('democratic').tom).toBe('dem');
  });
});
