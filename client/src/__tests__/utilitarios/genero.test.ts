import { describe, expect, it } from 'vitest';
import { generoEmPortugues } from '../../utilitarios/genero';

describe('generoEmPortugues', () => {
  it('traduz os valores conhecidos, sem depender de caixa', () => {
    expect(generoEmPortugues('Male')).toBe('Masculino');
    expect(generoEmPortugues('male')).toBe('Masculino');
    expect(generoEmPortugues('M')).toBe('Masculino');
    expect(generoEmPortugues('Female')).toBe('Feminino');
    expect(generoEmPortugues('FEMALE')).toBe('Feminino');
    expect(generoEmPortugues('f')).toBe('Feminino');
  });

  it('repassa valores desconhecidos como vieram', () => {
    expect(generoEmPortugues('Non-binary')).toBe('Non-binary');
  });

  it('devolve null para ausente ou vazio', () => {
    expect(generoEmPortugues(null)).toBeNull();
    expect(generoEmPortugues(undefined)).toBeNull();
    expect(generoEmPortugues('')).toBeNull();
  });
});
