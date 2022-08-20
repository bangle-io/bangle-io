/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { BrowserHistory } from '../browser-history';

describe('browser-history', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.history.replaceState(null, '', '/');
  });

  test('works', async () => {
    const onChange = jest.fn();
    const bh = new BrowserHistory('', onChange);

    bh.navigate('/hello-world');

    jest.runAllTimers();
    expect(onChange).toBeCalledTimes(1);
    expect(onChange).nthCalledWith(1, {
      pathname: '/hello-world',
      search: '',
    });
  });

  test('current path', async () => {
    const onChange = jest.fn();
    const bh = new BrowserHistory('', onChange);

    expect(bh.pathname).toBe('/');
  });

  test('reacts to `pushState` / `replaceState`', () => {
    const onChange = jest.fn();
    const bh = new BrowserHistory('', onChange);

    window.history.pushState(null, '', '/foo');
    expect(bh.pathname).toBe('/foo');

    window.history.replaceState(null, '', '/bar');

    expect(bh.pathname).toBe('/bar');
  });

  test('supports history.back() navigation', () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    const bh = new BrowserHistory('', onChange);
    window.history.pushState(null, '', '/foo');
    expect(bh.pathname).toBe('/foo');

    window.history.back();
    jest.runAllTimers();

    expect(bh.pathname).toBe('/');

    expect(onChange).toBeCalledTimes(2);
  });

  test('historyState refresh happens on change', () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    const bh = new BrowserHistory('', onChange);

    const refreshSpy = jest.spyOn(bh, 'refreshHistoryState');

    window.history.pushState({ hello: '123' }, '', '/foo');

    jest.runAllTimers();

    expect(refreshSpy).toBeCalledTimes(1);

    expect(onChange).toBeCalledTimes(1);
  });

  test('history state is set and preserved on pop & push', () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    const bh = new BrowserHistory('', onChange);

    bh.updateHistoryState('test-state');

    jest.runAllTimers();

    expect(window.history.state).toEqual({
      key: expect.any(Number),
      value: 'test-state',
    });

    bh.navigate('/foo-1');

    jest.runAllTimers();

    expect(window.history.state).toEqual({
      key: expect.any(Number),
      value: 'test-state',
    });

    window.history.back();

    jest.runAllTimers();

    expect(window.history.state).toEqual({
      key: expect.any(Number),
      value: 'test-state',
    });
  });

  test('returns a pathname without a basepath', () => {
    const bh = new BrowserHistory('/app', jest.fn());

    window.history.pushState(null, '', '/app/dashboard');

    expect(bh.pathname).toBe('/dashboard');
  });

  test('basepath should be case-insensitive', () => {
    const bh = new BrowserHistory('/MyApp', jest.fn());

    window.history.pushState(null, '', '/myAPP/users/JohnDoe');

    expect(bh.pathname).toBe('/users/JohnDoe');
  });

  test('supports search url', () => {
    const onChange = jest.fn();

    const bh = new BrowserHistory(undefined, onChange);

    expect(bh.pathname).toBe('/');

    window.history.pushState(null, '', '/foo');
    expect(onChange).toBeCalledTimes(1);

    expect(bh.pathname).toBe('/foo');
    window.history.pushState(null, '', '/foo');

    expect(onChange).toBeCalledTimes(1);

    expect(bh.pathname).toBe('/foo');

    window.history.pushState(null, '', '/foo?hello=world');
    expect(onChange).toBeCalledTimes(2);

    expect(bh.pathname).toBe('/foo');

    window.history.pushState(null, '', '/foo?goodbye=world');
    expect(onChange).toBeCalledTimes(3);

    expect(bh.pathname).toBe('/foo');
  });
});
