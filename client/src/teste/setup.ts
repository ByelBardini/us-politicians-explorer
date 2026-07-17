import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { servidor } from './msw';

// `onUnhandledRequest: 'error'` é a trava: uma requisição que nenhum teste previu
// falha a suíte em vez de virar `undefined` silencioso no meio de um assert.
beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }));

// Sem `globals: true`, o Testing Library não registra o cleanup automático;
// fazemos isso à mão para isolar o DOM entre cada teste.
afterEach(() => {
  cleanup();
  servidor.resetHandlers();
});

afterAll(() => servidor.close());
