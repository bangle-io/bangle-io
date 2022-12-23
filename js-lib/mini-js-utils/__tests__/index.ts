import { deepMerge } from '..';

describe('deepMerge', () => {
  test('works', () => {
    expect(deepMerge({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
    expect(deepMerge({ a: 1 }, { b: 2, c: { d: 1, e: 2 } })).toEqual({
      a: 1,
      b: 2,
      c: { d: 1, e: 2 },
    });

    expect(deepMerge({ a: 1, c: { d: 1, e: 2 } }, { b: 2 })).toEqual({
      a: 1,
      b: 2,
      c: { d: 1, e: 2 },
    });

    expect(deepMerge({ a: 1, c: {} }, { b: 2, c: { d: 1, e: 2 } })).toEqual({
      a: 1,
      b: 2,
      c: { d: 1, e: 2 },
    });

    expect(deepMerge({ a: 1, c: [] }, { b: 2, c: [1] })).toEqual({
      a: 1,
      b: 2,
      c: [1],
    });

    expect(deepMerge({ a: 1, c: [2] }, { b: 2, c: [1] })).toEqual({
      a: 1,
      b: 2,
      c: [2, 1],
    });

    expect(deepMerge({ a: 1, c: [] }, { b: 2, c: {} })).toEqual({
      a: 1,
      b: 2,
      c: {},
    });
  });
});
