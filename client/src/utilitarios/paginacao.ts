/**
 * Páginas a exibir: primeira, última e a vizinhança da atual,
 * com 'gap' (elipse) onde houver salto.
 */
export function paginasVisiveis(page: number, totalPages: number): Array<number | 'gap'> {
  const alvo = new Set(
    [1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages),
  );
  const ordenadas = [...alvo].sort((a, b) => a - b);

  const saida: Array<number | 'gap'> = [];
  let anterior = 0;
  for (const p of ordenadas) {
    if (p - anterior > 1) saida.push('gap');
    saida.push(p);
    anterior = p;
  }
  return saida;
}
