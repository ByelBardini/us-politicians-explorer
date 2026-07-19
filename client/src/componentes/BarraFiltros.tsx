import { useFiltros } from '../hooks/useFiltros';

export interface ValorFiltros {
  estado: string;
  partido: string;
  q: string;
}

const campo =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700';
const rotulo = 'text-sm font-medium text-slate-600';

export function BarraFiltros({
  valor,
  onChange,
  total,
}: {
  valor: ValorFiltros;
  onChange: (v: ValorFiltros) => void;
  total?: number;
}) {
  const { data } = useFiltros();

  return (
    <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
      {/* Dropdowns aparecem quando o /filtros carrega (opções vêm de lá). */}
      {data && (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor="filtro-estado" className={rotulo}>
              Estado
            </label>
            <select
              id="filtro-estado"
              value={valor.estado}
              onChange={(e) => onChange({ ...valor, estado: e.target.value })}
              className={campo}
            >
              <option value="">Todos os estados</option>
              {data.estados.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="filtro-partido" className={rotulo}>
              Partido
            </label>
            <select
              id="filtro-partido"
              value={valor.partido}
              onChange={(e) => onChange({ ...valor, partido: e.target.value })}
              className={campo}
            >
              <option value="">Todos os partidos</option>
              {data.partidos.map((partido) => (
                <option key={partido} value={partido}>
                  {partido}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {total !== undefined && (
        <p className="text-sm text-slate-500 sm:ml-auto sm:pb-2" aria-live="polite">
          <span className="font-semibold text-slate-700">{total}</span>{' '}
          {total === 1 ? 'político encontrado' : 'políticos encontrados'}
        </p>
      )}
    </div>
  );
}
