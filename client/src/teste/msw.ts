import { setupServer } from 'msw/node';

/**
 * Servidor de teste. Diferente de `vi.mock('../api/politicos')`, o MSW intercepta
 * no nível da rede: o `fetch` real roda, a query string real é montada e o status
 * real chega — o que ele finge é só o servidor do outro lado.
 *
 * Cada teste registra seus handlers com `servidor.use(...)`; o `setup.ts` reseta
 * entre testes. Não há handler default de propósito.
 */
export const servidor = setupServer();

/** Mesma base usada pelo código de produção, para os handlers casarem a URL. */
export const urlApi = (caminho: string) => `${import.meta.env.VITE_API_URL}${caminho}`;
