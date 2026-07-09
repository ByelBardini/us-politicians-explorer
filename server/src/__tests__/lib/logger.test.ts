import { describe, expect, it, vi } from 'vitest';

import { consoleLogger } from '../../lib/logger.js';

describe('consoleLogger', () => {
  it('delega info para console.info', () => {
    const espiao = vi.spyOn(console, 'info').mockImplementation(() => {});

    consoleLogger.info('sincronizando California');

    expect(espiao).toHaveBeenCalledExactlyOnceWith('sincronizando California');
  });

  it('delega warn para console.warn', () => {
    const espiao = vi.spyOn(console, 'warn').mockImplementation(() => {});

    consoleLogger.warn('per_page efetivo menor que o pedido');

    expect(espiao).toHaveBeenCalledExactlyOnceWith('per_page efetivo menor que o pedido');
  });

  it('delega error para console.error, repassando o erro', () => {
    const espiao = vi.spyOn(console, 'error').mockImplementation(() => {});
    const causa = new Error('429');

    consoleLogger.error('sync falhou', causa);

    expect(espiao).toHaveBeenCalledExactlyOnceWith('sync falhou', causa);
  });

  it('não passa um segundo argumento para console.error quando não há erro', () => {
    const espiao = vi.spyOn(console, 'error').mockImplementation(() => {});

    consoleLogger.error('sync falhou');

    // Evita imprimir um `undefined` solto na saída.
    expect(espiao).toHaveBeenCalledExactlyOnceWith('sync falhou');
  });
});
