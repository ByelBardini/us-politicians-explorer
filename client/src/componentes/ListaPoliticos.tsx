import type { Politico } from '../tipos/politico';
import { PoliticoCard } from './PoliticoCard';
import { Carregando, Vazio } from './Estados';

export function ListaPoliticos({
  itens,
  carregando,
  onSelecionar,
  onLimparFiltros,
}: {
  itens: Politico[];
  carregando: boolean;
  onSelecionar: (p: Politico) => void;
  onLimparFiltros?: () => void;
}) {
  if (carregando) return <Carregando />;
  if (itens.length === 0) return <Vazio onLimparFiltros={onLimparFiltros} />;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {itens.map((p) => (
        <PoliticoCard key={p.id} politico={p} onSelecionar={onSelecionar} />
      ))}
    </div>
  );
}
