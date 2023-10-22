import { shallowEqual } from '../helpers';

describe('shallowEqual', () => {
  it('returns true for two identical objects', () => {
    const objA = { a: 1, b: 2, c: 3 };
    const objB = { a: 1, b: 2, c: 3 };
    expect(shallowEqual(objA, objB)).toBe(true);
  });

  it('returns true for two identical objects with different key orders', () => {
    const objA = { a: 1, b: 2, c: 3 };
    const objB = { c: 3, b: 2, a: 1 };
    expect(shallowEqual(objA, objB)).toBe(true);
  });

  it('returns false for two different objects', () => {
    const objA = { a: 1, b: 2, c: 3 };
    const objB = { a: 1, b: 2, d: 4 };
    expect(shallowEqual(objA, objB)).toBe(false);
  });

  it('returns false for objects with different lengths', () => {
    const objA = { a: 1, b: 2, c: 3 };
    const objB = { a: 1, b: 2 };
    expect(shallowEqual(objA, objB)).toBe(false);
  });

  it('returns true for the same object instance', () => {
    const objA = { a: 1, b: 2, c: 3 };
    const objB = objA;
    expect(shallowEqual(objA, objB)).toBe(true);
  });

  it('returns true for two empty objects', () => {
    const objA = {};
    const objB = {};
    expect(shallowEqual(objA, objB)).toBe(true);
  });

  it('returns true for identical nested objects', () => {
    const objA = { a: 1, b: { c: 2 } };
    const objB = { a: 1, b: { c: 2 } };
    expect(shallowEqual(objA, objB)).toBe(false); // the nested objects are not the same instance
  });

  it('returns true for same instances of nested objects', () => {
    const nested = { c: 2 };
    const objA = { a: 1, b: nested };
    const objB = { a: 1, b: nested };
    expect(shallowEqual(objA, objB)).toBe(true); // the nested objects are the same instance
  });

  it('returns false for different instances of nested objects', () => {
    const objA = { a: 1, b: { c: 2 } };
    const objB = { a: 1, b: { c: 3 } };
    expect(shallowEqual(objA, objB)).toBe(false); // the nested objects are not the same instance
  });

  it('returns true for same instances of nested arrays', () => {
    const nested = [1, 2, 3];
    const objA = { a: 1, b: nested };
    const objB = { a: 1, b: nested };
    expect(shallowEqual(objA, objB)).toBe(true); // the nested arrays are the same instance
  });

  it('returns false for different instances of nested arrays', () => {
    const objA = { a: 1, b: [1, 2, 3] };
    const objB = { a: 1, b: [1, 2, 3] };
    expect(shallowEqual(objA, objB)).toBe(false); // the nested arrays are not the same instance
  });
});
