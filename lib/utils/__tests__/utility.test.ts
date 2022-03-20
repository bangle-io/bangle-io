import { exponentialBackoff } from '..';
import { shallowCompareArray } from '../utility';

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

describe('exponentialBackoff', () => {
  let originalSetTimeout = global.setTimeout;
  beforeEach(() => {
    (global as any).setTimeout = jest.fn((cb) => cb());
  });
  afterEach(() => {
    (global as any).setTimeout = originalSetTimeout;
  });

  test('works', async () => {
    let count = 0;
    const abort = new AbortController();

    let cb = jest.fn(() => {
      if (count++ === 4) {
        return true;
      }

      return false;
    });

    await exponentialBackoff(cb, abort.signal);

    expect(cb).toBeCalledTimes(5);
    expect(setTimeout).toBeCalledTimes(4);
    expect(setTimeout).nthCalledWith(1, expect.any(Function), 20);
    expect(setTimeout).nthCalledWith(2, expect.any(Function), 2 * 20);
    expect(setTimeout).nthCalledWith(3, expect.any(Function), 2 * 2 * 20);
    expect(setTimeout).nthCalledWith(4, expect.any(Function), 2 * 2 * 2 * 20);
  });

  test('aborting works', async () => {
    let count = 0;
    const abort = new AbortController();

    let cb = jest.fn(() => {
      if (count++ === 1) {
        abort.abort();
      }

      return false;
    });

    await exponentialBackoff(cb, abort.signal);

    expect(cb).toBeCalledTimes(2);
    expect(setTimeout).toBeCalledTimes(1);
    expect(setTimeout).nthCalledWith(1, expect.any(Function), 20);
  });

  test('max try is respected', async () => {
    const abort = new AbortController();

    let cb = jest.fn(() => {
      return false;
    });

    await exponentialBackoff(cb, abort.signal, { maxTry: 8 });

    expect(cb).toBeCalledTimes(8);
    expect(setTimeout).toBeCalledTimes(8);
  });
});
