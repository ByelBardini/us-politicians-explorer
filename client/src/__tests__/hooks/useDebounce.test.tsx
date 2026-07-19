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

  it('reinicia o intervalo a cada mudança — valores intermediários nunca propagam', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 350), {
      initialProps: { v: 'a' },
    });

    rerender({ v: 'ab' });
    act(() => {
      vi.advanceTimersByTime(300); // quase vencendo...
    });
    rerender({ v: 'abc' }); // ...mas uma nova mudança zera o timer

    act(() => {
      vi.advanceTimersByTime(300); // 600ms desde "ab": sem o clearTimeout, "ab" teria propagado
    });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current).toBe('abc');
  });
});
