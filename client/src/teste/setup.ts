import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Sem `globals: true`, o Testing Library não registra o cleanup automático;
// fazemos isso à mão para isolar o DOM entre cada teste.
afterEach(() => {
  cleanup();
});
