/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { act, renderHook } from '@testing-library/react-hooks';

import { KEY_PREFIX, useLocalStorage } from '../use-local-storage';

describe('useLocalStorage', () => {
  let originalLocalStorage: typeof localStorage;
  const dateNow = Date.now;

  beforeEach(() => {
    Date.now = jest.fn(() => 99);

    originalLocalStorage = window.localStorage;
    let store: any = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key) => {
          return store[key] || null;
        }),
        setItem: jest.fn((key, value) => {
          store[key] = value.toString();
        }),
        clear() {
          store = {};
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    (window as any).localStorage = originalLocalStorage;
    Date.now = dateNow;
  });

  test('should initialize', async () => {
    const { result } = renderHook(() =>
      useLocalStorage('my-key', { counter: 0 }),
    );

    expect(result.current[0]).toEqual({ counter: 0 });
    expect(window.localStorage.setItem).nthCalledWith(
      1,
      KEY_PREFIX + 'my-key',
      JSON.stringify({
        payload: { counter: 0 },
        time: 99,
      }),
    );

    expect(window.localStorage.setItem).toBeCalledTimes(1);

    act(() => {
      result.current[1]((obj) => ({
        counter: obj.counter + 1,
      }));
    });

    expect(result.current[0]).toEqual({ counter: 1 });
    expect(window.localStorage.setItem).toBeCalledTimes(2);
    expect(window.localStorage.setItem).nthCalledWith(
      2,
      KEY_PREFIX + 'my-key',
      JSON.stringify({ payload: { counter: 1 }, time: 99 }),
    );
  });

  test('change of  initial value should only save value once', async () => {
    const { result, rerender } = renderHook(
      ({ key, value }) => useLocalStorage(key, value),
      {
        initialProps: { key: 'first-key', value: 'first-value' },
      },
    );

    expect(result.current[0]).toEqual('first-value');

    rerender({ key: 'first-key', value: 'other-value' });

    expect(result.current[0]).toEqual('first-value');

    expect(window.localStorage.setItem).toBeCalledTimes(1);
    expect(window.localStorage.setItem).nthCalledWith(
      1,
      KEY_PREFIX + 'first-key',
      JSON.stringify({ payload: 'first-value', time: 99 }),
    );
  });

  test('change of key should work', async () => {
    const { result, rerender } = renderHook(
      ({ key, value }) => useLocalStorage(key, value),
      {
        initialProps: { key: 'first-key', value: 'first-value' },
      },
    );

    expect(result.current[0]).toEqual('first-value');
    act(() => {
      result.current[1]((obj) => 'first-value-modified');
    });

    rerender({ key: 'second-key', value: 'second-value' });

    expect(result.current[0]).toEqual('second-value');

    // bring back first key to see if the modified value is persisted
    rerender({ key: 'first-key', value: 'some-other-value' });

    expect(result.current[0]).toEqual('first-value-modified');

    // retrieving the second key should return the old value
    rerender({ key: 'second-key', value: 'some-other-value-2' });

    expect(result.current[0]).toEqual('second-value');

    act(() => {
      result.current[1]('new-second-value');
    });

    expect(result.current[0]).toEqual('new-second-value');
    expect(window.localStorage.setItem).lastCalledWith(
      KEY_PREFIX + 'second-key',
      JSON.stringify({ payload: 'new-second-value', time: 99 }),
    );
  });

  test('handles null value', async () => {
    const { result } = renderHook(
      ({ key, value }) => useLocalStorage<string | null>(key, value),
      {
        initialProps: { key: 'first-key', value: 'first-value' },
      },
    );

    act(() => {
      result.current[1](null);
    });

    expect(result.current[0]).toEqual(null);
    expect(window.localStorage.setItem).lastCalledWith(
      KEY_PREFIX + 'first-key',
      JSON.stringify({ payload: null, time: 99 }),
    );
  });
});
