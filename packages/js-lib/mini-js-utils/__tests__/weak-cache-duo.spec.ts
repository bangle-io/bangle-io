import { describe, expect, it, vi } from 'vitest';
import { weakCacheDuo } from '../weak-cache-duo';

describe('weakCacheDuo', () => {
  it('caches results by both object identities', () => {
    const fn = vi.fn((left: object, right: object) => ({ left, right }));
    const cachedFn = weakCacheDuo(fn);
    const left = {};
    const right = {};

    expect(cachedFn(left, right)).toBe(cachedFn(left, right));
    expect(fn).toHaveBeenCalledTimes(1);

    cachedFn(right, left);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not recompute a cached undefined result', () => {
    const fn = vi.fn((_left: object, _right: object) => undefined);
    const cachedFn = weakCacheDuo(fn);
    const left = {};
    const right = {};

    expect(cachedFn(left, right)).toBeUndefined();
    expect(cachedFn(left, right)).toBeUndefined();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
