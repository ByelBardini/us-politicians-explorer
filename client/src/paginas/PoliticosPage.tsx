import { useState } from 'react';
import { usePoliticos } from '../hooks/usePoliticos';
import { useDebounce } from '../hooks/useDebounce';
import { Cabecalho } from '../componentes/Cabecalho';
import { BarraFiltros, type ValorFiltros } from '../componentes/BarraFiltros';
import { ListaPoliticos } from '../componentes/ListaPoliticos';
import { Paginacao } from '../componentes/Paginacao';
import { DetalhePolitico } from '../componentes/DetalhePolitico';
import { Erro } from '../componentes/Estados';
import type { Politico } from '../tipos/politico';

const FILTROS_VAZIOS: ValorFiltros = { estado: '', partido: '', q: '' };

export function PoliticosPage() {
  const [filtros, setFiltros] = useState<ValorFiltros>(FILTROS_VAZIOS);
  const [page, setPage] = useState(1);
  const [selecionado, setSelecionado] = useState<Politico | null>(null);
  const q = useDebounce(filtros.q, 350);

  const { data, isPending, isError, refetch } = usePoliticos({
    estado: filtros.estado || undefined,
    partido: filtros.partido || undefined,
    q: q || undefined,
    page,
    perPage: 12,
  });

  function aoMudarFiltros(novos: ValorFiltros) {
    setFiltros(novos);
    setPage(1); // trocar filtro sempre volta p/ a página 1
  }

  return (
    <>
      <Cabecalho q={filtros.q} onBuscar={(q) => aoMudarFiltros({ ...filtros, q })} />
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <BarraFiltros
          valor={filtros}
          onChange={aoMudarFiltros}
          total={isError ? undefined : data?.pagination.total}
        />
        {isError ? (
          <Erro onTentarDeNovo={refetch} />
        ) : (
          <>
            <ListaPoliticos
              itens={data?.data ?? []}
              carregando={isPending}
              onSelecionar={setSelecionado}
              onLimparFiltros={() => aoMudarFiltros(FILTROS_VAZIOS)}
            />
            {data && <Paginacao pagination={data.pagination} onPage={setPage} />}
          </>
        )}
        <DetalhePolitico politico={selecionado} onFechar={() => setSelecionado(null)} />
      </main>
    </>
  );
}
