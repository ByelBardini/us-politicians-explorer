export type TomPartido = 'dem' | 'rep' | 'outro';

export interface CorPartido {
  /** Identificador do tom, exposto como data-attribute (útil em testes). */
  tom: TomPartido;
  /** Faixa de destaque (topo do card/drawer). */
  faixa: string;
  /** Dot do badge. */
  dot: string;
  /** Fundo + texto do badge. */
  badge: string;
}

// Strings literais completas: o scanner do Tailwind v4 só gera classes que
// aparecem inteiras no código — nunca montar `bg-${...}`.
const CORES: Record<TomPartido, CorPartido> = {
  dem: { tom: 'dem', faixa: 'bg-dem', dot: 'bg-dem', badge: 'bg-dem-suave text-dem' },
  rep: { tom: 'rep', faixa: 'bg-rep', dot: 'bg-rep', badge: 'bg-rep-suave text-rep' },
  outro: {
    tom: 'outro',
    faixa: 'bg-outro',
    dot: 'bg-outro',
    badge: 'bg-outro-suave text-slate-700',
  },
};

// `includes` cobre variações reais como "Democratic-Farmer-Labor".
export function corDoPartido(partido: string | null | undefined): CorPartido {
  const nome = partido?.toLowerCase() ?? '';
  if (nome.includes('democrat')) return CORES.dem;
  if (nome.includes('republican')) return CORES.rep;
  return CORES.outro;
}
