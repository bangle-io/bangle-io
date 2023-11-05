import { deepMerge, difference, intersect } from '..';

describe('deepMerge', () => {
  test('works', () => {
    expect(deepMerge({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
    expect(deepMerge({ a: 1 }, { a: 2 })).toEqual({ a: 2 });
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

    expect(deepMerge({}, { b: 2, a: 1, c: { d: 1, e: 2 } })).toEqual({
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

    expect(
      deepMerge({ a: 1, c: [] }, { b: 2, c: {} }, { e: 3, f: { d: 33 } }),
    ).toEqual({
      a: 1,
      b: 2,
      c: {},
      e: 3,
      f: { d: 33 },
    });

    expect(
      deepMerge(
        { a: 1, c: [], f: { r: 12 } },
        { b: 2, c: {} },
        { e: 3, f: { d: 33 } },
      ),
    ).toEqual({
      a: 1,
      b: 2,
      c: {},
      e: 3,
      f: { r: 12, d: 33 },
    });

    expect(
      deepMerge(
        { a: 1, c: [], f: { r: 12 } },
        { b: 2, c: {}, f: { z: 12 } },
        { e: 3, f: { d: 33 } },
      ),
    ).toEqual({
      a: 1,
      b: 2,
      c: {},
      e: 3,
      f: { r: 12, d: 33, z: 12 },
    });
  });

  test('works with array', () => {
    expect(deepMerge({ a: 1, c: [2] }, { b: 2, c: [1] })).toEqual({
      a: 1,
      b: 2,
      c: [2, 1],
    });

    expect(deepMerge({ a: 1, c: [] }, { b: 2, c: [1] })).toEqual({
      a: 1,
      b: 2,
      c: [1],
    });

    expect(deepMerge({ a: 1, c: [1, 2, []] }, { b: 2, c: [3, [1]] })).toEqual({
      a: 1,
      b: 2,
      c: [1, 2, [], 3, [1]],
    });
  });

  test('does not modify target or source', () => {
    let target = { a: 1, c: [2] };
    let source = { b: 2, c: [1] };
    let result = deepMerge(target, source);
    expect(result).toEqual({
      a: 1,
      b: 2,
      c: [2, 1],
    });

    expect(target).toEqual({ a: 1, c: [2] });
    expect(source).toEqual({ b: 2, c: [1] });
  });
});

describe('set ops', () => {
  test('difference works', () => {
    expect(difference([1, 2, 3], [1, 2])).toEqual([3]);
    expect(difference([1, 2, 3], [3])).toEqual([1, 2]);
    expect(difference([1, 2, 3], [1, 2, 3])).toEqual([]);
    expect(difference([1, 2, 3], [1, 2, 3, 4])).toEqual([]);
    expect(difference([1, 2, 3], [4, 5, 6])).toEqual([1, 2, 3]);
    expect(difference([1, 2, 3], [4, 5, 6, 1, 2, 3])).toEqual([]);
  });

  test('intersect works', () => {
    expect(intersect([1, 2, 3], [1, 2])).toEqual([1, 2]);
    expect(intersect(new Set([1, 2, 3]), new Set([1, 2]))).toEqual([1, 2]);
    expect(intersect([1, 2, 3], [3])).toEqual([3]);
    expect(intersect([1, 2, 3], [1, 2, 3])).toEqual([1, 2, 3]);
    expect(intersect([1, 2, 3], [1, 2, 3, 4])).toEqual([1, 2, 3]);
    expect(intersect([1, 2, 3], [4, 5, 6])).toEqual([]);
    expect(intersect([1, 2, 3], [4, 5, 6, 1, 2, 3])).toEqual([1, 2, 3]);
  });
});
