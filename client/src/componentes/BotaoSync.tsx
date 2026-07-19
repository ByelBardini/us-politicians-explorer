import { useSync } from '../hooks/useSync';

/**
 * Disparo manual do sync. O 202 chega na hora; o processamento segue em
 * background no servidor, então o feedback é "iniciado", não "concluído".
 */
export function BotaoSync() {
  const { mutate, isPending, isSuccess, isError, data, error } = useSync();

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button
        type="button"
        onClick={() => mutate()}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg
          className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v6h6M20 20v-6h-6M5.5 9a7.5 7.5 0 0 1 12.9-2.5L20 10M4 14l1.6 3.5A7.5 7.5 0 0 0 18.5 15"
          />
        </svg>
        {isPending ? 'Sincronizando…' : 'Sincronizar'}
      </button>

      {isSuccess && (
        <p role="status" className="text-xs text-slate-500">
          {data.message}
        </p>
      )}
      {isError && (
        <p role="alert" className="text-xs text-red-600">
          {error.message}
        </p>
      )}
    </div>
  );
}
