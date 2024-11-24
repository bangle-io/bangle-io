import { describe, expect, it } from 'vitest';
import { weakCache } from '../index';

describe('weakCache', () => {
  it('should cache function results using WeakMap', () => {
    let callCount = 0;

    const fn = (obj: { value: number }) => {
      callCount++;
      return obj.value;
    };

    const cachedFn = weakCache(fn);

    const arg1 = { value: 42 };
    const arg2 = { value: 43 };

    // First call with arg1: should invoke fn and cache the result
    expect(cachedFn(arg1)).toBe(42);
    expect(callCount).toBe(1);

    // Second call with arg1: should use cached result
    expect(cachedFn(arg1)).toBe(42);
    expect(callCount).toBe(1);

    // First call with arg2: should invoke fn and cache the result
    expect(cachedFn(arg2)).toBe(43);
    expect(callCount).toBe(2);

    // Second call with arg2: should use cached result
    expect(cachedFn(arg2)).toBe(43);
    expect(callCount).toBe(2);

    // Call again with arg1 to ensure caching is consistent
    expect(cachedFn(arg1)).toBe(42);
    expect(callCount).toBe(2);
  });

  it('should handle different objects with identical content as separate keys', () => {
    let callCount = 0;

    const fn = (obj: { value: number }) => {
      callCount++;
      return obj.value;
    };

    const cachedFn = weakCache(fn);

    const arg1 = { value: 42 };
    const arg2 = { value: 42 }; // Different object with same content

    // Both calls should invoke fn because the objects are different
    expect(cachedFn(arg1)).toBe(42);
    expect(callCount).toBe(1);

    expect(cachedFn(arg2)).toBe(42);
    expect(callCount).toBe(2);
  });
});
