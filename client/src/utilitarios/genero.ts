// A OpenStates devolve o gênero em inglês ("Male", "Female", às vezes outra
// grafia/valor livre). Traduz os conhecidos e repassa o resto como veio —
// melhor mostrar o valor original do que esconder ou traduzir errado.
export function generoEmPortugues(genero: string | null | undefined): string | null {
  if (!genero) return null;
  const normalizado = genero.trim().toLowerCase();
  if (normalizado === 'male' || normalizado === 'm') return 'Masculino';
  if (normalizado === 'female' || normalizado === 'f') return 'Feminino';
  return genero;
}
