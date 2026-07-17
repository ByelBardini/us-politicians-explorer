import type { Pagination } from '../tipos/politico';

const botao =
  'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40';

export function Paginacao({
  pagination,
  onPage,
}: {
  pagination: Pagination;
  onPage: (page: number) => void;
}) {
  const { page, totalPages } = pagination;
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-6 flex items-center justify-center gap-4" aria-label="Paginação">
      <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} className={botao}>
        Anterior
      </button>
      <span className="text-sm text-slate-600" aria-live="polite">
        Página {page} de {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        className={botao}
      >
        Próxima
      </button>
    </nav>
  );
}
