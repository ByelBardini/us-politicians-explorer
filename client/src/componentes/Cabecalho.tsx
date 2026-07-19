export function Cabecalho({ q, onBuscar }: { q: string; onBuscar: (q: string) => void }) {
  return (
    <header className="bg-navy-800 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">US Politicians Explorer</h1>
        <p className="mt-1 text-sm text-slate-300 sm:text-base">
          Explore legisladores estaduais dos EUA por nome, estado e partido.
        </p>

        <div className="relative mt-6 max-w-xl">
          <svg
            className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="m20 20-3.5-3.5" />
          </svg>
          <label htmlFor="filtro-busca" className="sr-only">
            Buscar por nome
          </label>
          <input
            id="filtro-busca"
            type="search"
            value={q}
            onChange={(e) => onBuscar(e.target.value)}
            placeholder="Buscar por nome…"
            className="w-full rounded-xl border-0 bg-white py-2.5 pr-4 pl-11 text-slate-900 shadow-lg placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-dem"
          />
        </div>
      </div>
    </header>
  );
}
