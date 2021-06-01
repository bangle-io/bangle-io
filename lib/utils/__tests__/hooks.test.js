import { renderHook, act } from '@testing-library/react-hooks';
import { useLocalStorage } from '../hooks';

describe('useLocalStorage', () => {
  let originalLocalStorage;
  beforeEach(() => {
    originalLocalStorage = window.localStorage;
    let store = {};
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
    window.localStorage = originalLocalStorage;
  });

  test('should initialize', async () => {
    const { result } = renderHook(() =>
      useLocalStorage('my-key', { counter: 0 }),
    );

    expect(result.current[0]).toEqual({ counter: 0 });

    // doesnt get called with initial value
    expect(window.localStorage.setItem).toBeCalledTimes(0);

    act(() => {
      result.current[1]((obj) => ({
        counter: obj.counter + 1,
      }));
    });

    expect(result.current[0]).toEqual({ counter: 1 });
    expect(window.localStorage.setItem).toBeCalledTimes(1);
    expect(window.localStorage.setItem).nthCalledWith(
      1,
      'my-key',
      JSON.stringify({ counter: 1 }),
    );
  });

  test('change of  initial value has no effect', async () => {
    const { result, rerender } = renderHook(
      ({ key, value }) => useLocalStorage(key, value),
      {
        initialProps: { key: 'first-key', value: 'first-value' },
      },
    );

    expect(result.current[0]).toEqual('first-value');

    rerender({ key: 'first-key', value: 'other-value' });

    expect(result.current[0]).toEqual('first-value');
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

    // retrieve the second key
    rerender({ key: 'second-key', value: 'some-other-value-2' });

    // because the initial value was changed and we donot store the initial
    // value in localsstorage it is correct.
    expect(result.current[0]).toEqual('some-other-value-2');
  });
});
