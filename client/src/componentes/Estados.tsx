export function Carregando({ quantidade = 6 }: { quantidade?: number }) {
  return (
    <div
      role="status"
      aria-label="Carregando políticos"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: quantidade }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-slate-200" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      ))}
      <span className="sr-only">Carregando…</span>
    </div>
  );
}

export function Vazio() {
  return (
    <div
      role="status"
      className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500"
    >
      <p className="font-medium">Nenhum político encontrado</p>
      <p className="text-sm">Tente ajustar os filtros ou a busca.</p>
    </div>
  );
}

export function Erro({ onTentarDeNovo }: { onTentarDeNovo?: () => void }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 p-10 text-center text-red-700"
    >
      <p className="font-medium">Não foi possível carregar os políticos</p>
      <p className="text-sm">Verifique sua conexão e tente novamente.</p>
      {onTentarDeNovo && (
        <button
          type="button"
          onClick={onTentarDeNovo}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          Tentar de novo
        </button>
      )}
    </div>
  );
}
