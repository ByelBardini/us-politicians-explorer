import { afterEach, describe, expect, it, vi } from 'vitest';

import { sleep } from '../sleep.js';

describe('sleep', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolve após o tempo informado', async () => {
    vi.useFakeTimers();

    let resolvido = false;
    const pendente = sleep(1100).then(() => {
      resolvido = true;
    });

    await vi.advanceTimersByTimeAsync(1100);
    await pendente;

    expect(resolvido).toBe(true);
  });

  it('não resolve antes do tempo', async () => {
    vi.useFakeTimers();

    let resolvido = false;
    void sleep(1100).then(() => {
      resolvido = true;
    });

    await vi.advanceTimersByTimeAsync(1099);

    expect(resolvido).toBe(false);
  });
});
