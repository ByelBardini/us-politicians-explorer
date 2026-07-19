export function Carregando({ quantidade = 8 }: { quantidade?: number }) {
  return (
    <div
      role="status"
      aria-label="Carregando políticos"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {Array.from({ length: quantidade }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-center overflow-hidden rounded-2xl border border-slate-200 bg-white pb-5"
        >
          <div className="h-14 w-full animate-pulse bg-slate-200" />
          <div className="-mt-10 h-20 w-20 animate-pulse rounded-full bg-slate-300 ring-4 ring-white" />
          <div className="mt-4 h-4 w-2/3 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-5 w-24 animate-pulse rounded-full bg-slate-200" />
        </div>
      ))}
      <span className="sr-only">Carregando…</span>
    </div>
  );
}

export function Vazio({ onLimparFiltros }: { onLimparFiltros?: () => void }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center text-slate-500"
    >
      <svg
        className="mb-4 h-10 w-10 text-slate-300"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="m20 20-3.5-3.5" />
      </svg>
      <p className="font-semibold text-slate-700">Nenhum político encontrado</p>
      <p className="mt-1 text-sm">Tente ajustar os filtros ou a busca.</p>
      {onLimparFiltros && (
        <button
          type="button"
          onClick={onLimparFiltros}
          className="mt-5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}

export function Erro({ onTentarDeNovo }: { onTentarDeNovo?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-2xl border border-red-200 bg-red-50 px-6 py-14 text-center text-red-700"
    >
      <svg
        className="mb-4 h-10 w-10 text-red-300"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
        />
      </svg>
      <p className="font-semibold">Não foi possível carregar os políticos</p>
      <p className="mt-1 text-sm">Verifique sua conexão e tente novamente.</p>
      {onTentarDeNovo && (
        <button
          type="button"
          onClick={onTentarDeNovo}
          className="mt-5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          Tentar de novo
        </button>
      )}
    </div>
  );
}
