import { describe, expect, it } from 'vitest';
import { paginasVisiveis } from '../../utilitarios/paginacao';

describe('paginasVisiveis', () => {
  it('na primeira página mostra o início e a última com um salto', () => {
    expect(paginasVisiveis(1, 10)).toEqual([1, 2, 'gap', 10]);
  });

  it('na última página mostra a primeira e o fim com um salto', () => {
    expect(paginasVisiveis(10, 10)).toEqual([1, 'gap', 9, 10]);
  });

  it('no meio mostra dois saltos', () => {
    expect(paginasVisiveis(5, 20)).toEqual([1, 'gap', 4, 5, 6, 'gap', 20]);
  });

  it('sem saltos quando tudo é contíguo', () => {
    expect(paginasVisiveis(2, 3)).toEqual([1, 2, 3]);
    expect(paginasVisiveis(1, 2)).toEqual([1, 2]);
  });
});
