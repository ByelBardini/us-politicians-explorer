import { useEffect, useRef } from 'react';
import type { Politico } from '../tipos/politico';
import { generoEmPortugues } from '../utilitarios/genero';
import { corDoPartido } from '../utilitarios/partido';

const CAMARA_LABEL: Record<string, string> = {
  upper: 'Câmara alta',
  lower: 'Câmara baixa',
  executive: 'Executivo',
};

// As datas vêm como ISO em UTC (…T00:00:00Z). Formatamos em UTC para não exibir
// o dia anterior em fusos negativos (ex.: America/Sao_Paulo, UTC-3).
function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export function DetalhePolitico({
  politico,
  onFechar,
}: {
  politico: Politico | null;
  onFechar: () => void;
}) {
  const fecharRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!politico) return;

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar();
    }
    document.addEventListener('keydown', aoTeclar);
    fecharRef.current?.focus(); // foco inicial no botão fechar

    return () => document.removeEventListener('keydown', aoTeclar);
  }, [politico, onFechar]);

  if (!politico) return null;

  const cor = corDoPartido(politico.partido);

  const meta = [
    politico.cargo,
    politico.camara ? (CAMARA_LABEL[politico.camara] ?? politico.camara) : null,
    politico.distrito ? `Distrito ${politico.distrito}` : null,
    politico.estado,
  ].filter((x): x is string => Boolean(x));

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:flex-row sm:justify-end">
      {/* Backdrop: fecha ao clicar (conveniência de mouse; teclado usa o botão/Esc). */}
      <div aria-hidden="true" onClick={onFechar} className="absolute inset-0 bg-slate-900/50" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="detalhe-titulo"
        data-partido={cor.tom}
        className="relative z-10 flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:h-full sm:max-h-none sm:w-96 sm:max-w-full sm:rounded-none"
      >
        {/* Faixa na cor do partido com o botão fechar sobreposto. */}
        <div className={`relative h-20 w-full shrink-0 ${cor.faixa}`}>
          <button
            ref={fecharRef}
            type="button"
            onClick={onFechar}
            aria-label="Fechar detalhe"
            className="absolute top-3 right-3 rounded-lg p-1 text-white/80 transition hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6">
          {politico.foto && (
            <img
              src={politico.foto}
              alt=""
              className="relative z-10 -mt-12 h-24 w-24 rounded-full bg-white object-cover shadow-md ring-4 ring-white"
            />
          )}

          <h2
            id="detalhe-titulo"
            className={`${politico.foto ? 'mt-3' : 'mt-4'} text-xl font-bold text-slate-900`}
          >
            {politico.nome}
          </h2>

          {politico.partido && (
            <span
              className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cor.badge}`}
            >
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${cor.dot}`} />
              {politico.partido}
            </span>
          )}

          {meta.length > 0 && <p className="mt-3 text-sm text-slate-600">{meta.join(' · ')}</p>}

          <dl className="mt-5 space-y-3 text-sm">
            {politico.email && (
              <div>
                <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Email
                </dt>
                <dd>
                  <a href={`mailto:${politico.email}`} className="text-dem hover:underline">
                    {politico.email}
                  </a>
                </dd>
              </div>
            )}
            {politico.nascimento && (
              <div>
                <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Nascimento
                </dt>
                <dd>{formatarData(politico.nascimento)}</dd>
              </div>
            )}
            {politico.falecimento && (
              <div>
                <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Falecimento
                </dt>
                <dd>{formatarData(politico.falecimento)}</dd>
              </div>
            )}
            {politico.genero && (
              <div>
                <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Gênero
                </dt>
                <dd>{generoEmPortugues(politico.genero)}</dd>
              </div>
            )}
          </dl>

          {politico.contatos && politico.contatos.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Contatos
              </h3>
              <ul className="space-y-4">
                {politico.contatos.map((office, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                  >
                    {office.name && <p className="font-medium text-slate-700">{office.name}</p>}
                    {office.voice && (
                      <p className="text-slate-600">
                        Telefone:{' '}
                        <a href={`tel:${office.voice}`} className="text-dem hover:underline">
                          {office.voice}
                        </a>
                      </p>
                    )}
                    {office.fax && <p className="text-slate-600">Fax: {office.fax}</p>}
                    {office.address && <p className="text-slate-600">{office.address}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {politico.openstatesUrl && (
            <a
              href={politico.openstatesUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-block rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700"
            >
              Ver na OpenStates ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
