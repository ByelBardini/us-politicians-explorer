import type { Politico } from '../tipos/politico';

export function PoliticoCard({
  politico,
  onSelecionar,
}: {
  politico: Politico;
  onSelecionar: (p: Politico) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelecionar(politico)}
      className="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      {politico.foto ? (
        <img
          src={politico.foto}
          alt=""
          className="h-16 w-16 shrink-0 rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-500">
          {politico.nome.charAt(0)}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate font-semibold">{politico.nome}</p>
        <p className="truncate text-sm text-slate-500">
          {politico.cargo ?? '—'} · {politico.estado}
        </p>
        {politico.partido && (
          <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {politico.partido}
          </span>
        )}
      </div>
    </button>
  );
}
