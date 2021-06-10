const { shallowCompareArray } = require('../utility');

describe('shallowCompareArray', () => {
  test('works', () => {
    expect(shallowCompareArray([1, 2], [2, 1])).toBe(true);
    expect(shallowCompareArray([1, 2], [1, 2])).toBe(true);
    expect(shallowCompareArray([1], [1])).toBe(true);
    expect(shallowCompareArray([], [])).toBe(true);
  });

  test('works when not equal', () => {
    expect(shallowCompareArray([1, 2], [1])).toBe(false);
    expect(shallowCompareArray([1, 2], [1, 1])).toBe(false);
    expect(shallowCompareArray([], [2, 1])).toBe(false);
    expect(shallowCompareArray([1], [2])).toBe(false);
  });
});
