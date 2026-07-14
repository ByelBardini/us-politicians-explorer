import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebounce } from '../../hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('só propaga o valor após o intervalo', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 350), {
      initialProps: { v: 'a' },
    });
    expect(result.current).toBe('a');

    rerender({ v: 'ab' });
    expect(result.current).toBe('a'); // ainda dentro do intervalo

    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(result.current).toBe('ab');
  });
});
