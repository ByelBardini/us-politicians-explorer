import type { Politico } from '../tipos/politico';
import { corDoPartido } from '../utilitarios/partido';

export function PoliticoCard({
  politico,
  onSelecionar,
}: {
  politico: Politico;
  onSelecionar: (p: Politico) => void;
}) {
  const cor = corDoPartido(politico.partido);

  return (
    <button
      type="button"
      data-partido={cor.tom}
      onClick={() => onSelecionar(politico)}
      className="group flex w-full flex-col items-center overflow-hidden rounded-2xl border border-slate-200 bg-white pb-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700"
    >
      <div aria-hidden="true" className={`h-14 w-full ${cor.faixa}`} />

      {politico.foto ? (
        <img
          src={politico.foto}
          alt=""
          className="-mt-10 h-20 w-20 shrink-0 rounded-full bg-white object-cover shadow-md ring-4 ring-white"
          loading="lazy"
        />
      ) : (
        <div className="-mt-10 flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-slate-200 text-2xl font-semibold text-slate-500 shadow-md ring-4 ring-white">
          {politico.nome.charAt(0)}
        </div>
      )}

      <p className="mt-3 w-full px-4 font-semibold text-slate-900">{politico.nome}</p>
      <p className="mt-0.5 w-full px-4 text-sm text-slate-500">
        {politico.cargo ?? '—'}
        {politico.distrito ? ` · Distrito ${politico.distrito}` : ''}
      </p>

      {politico.partido && (
        <span
          className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cor.badge}`}
        >
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${cor.dot}`} />
          {politico.partido}
        </span>
      )}

      <p className="mt-2 text-xs font-medium tracking-wide text-slate-400 uppercase">
        {politico.estado}
      </p>
    </button>
  );
}
