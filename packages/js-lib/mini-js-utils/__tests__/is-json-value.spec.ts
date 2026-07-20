import { describe, expect, it } from 'vitest';
import { isJsonValue } from '../is-json-value';

describe('isJsonValue', () => {
  it.each([
    null,
    true,
    42,
    'text',
    [],
    [1, { nested: ['value'] }],
    {},
    { boolean: false, nullable: null },
  ])('accepts JSON-safe values', (value) => {
    expect(isJsonValue(value)).toBe(true);
  });

  it.each([
    undefined,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    () => undefined,
    Symbol('value'),
    BigInt(1),
    new Date(),
    new Map(),
    { nested: undefined },
    Array(1),
  ])('rejects values JSON would omit or normalize', (value) => {
    expect(isJsonValue(value)).toBe(false);
  });

  it('rejects circular and accessor-backed values', () => {
    const circular: unknown[] = [];
    circular.push(circular);
    const accessor = Object.defineProperty({}, 'value', {
      enumerable: true,
      get: () => 'value',
    });

    expect(isJsonValue(circular)).toBe(false);
    expect(isJsonValue(accessor)).toBe(false);
  });

  it('rejects array metadata that JSON would omit', () => {
    const value = [1];
    Object.defineProperty(value, 'metadata', { value: 'omitted' });

    expect(isJsonValue(value)).toBe(false);
  });

  it('allows repeated references that JSON can duplicate safely', () => {
    const child = { value: 'shared' };

    expect(isJsonValue({ first: child, second: child })).toBe(true);
  });
});
