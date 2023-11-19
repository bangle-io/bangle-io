/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { setupSliceTestStore, sleep } from '@bangle.io/test-helpers';

import { createHistoryRef, sliceHistory } from '../slice-history';

describe('sliceHistory', () => {
  test('initial empty state', async () => {
    const ctx = setupSliceTestStore({
      slices: [sliceHistory],
    });

    await ctx.runEffects();

    expect(sliceHistory.get(ctx.store.state)).toEqual({
      location: {
        pathname: '',
        search: '',
      },
      pendingNavigation: undefined,
    });
  });

  test('goTo', async () => {
    const ctx = setupSliceTestStore({
      slices: [sliceHistory],
    });

    await ctx.runEffects();

    const { store } = ctx;

    store.dispatch(
      sliceHistory.actions.goTo({
        pathname: '/foo',
      }),
    );

    expect(sliceHistory.get(ctx.store.state)).toEqual({
      location: {
        pathname: '',
        search: '',
      },
      pendingNavigation: {
        location: {
          pathname: '/foo',
        },
        preserve: true,
        replaceHistory: undefined,
      },
    });

    await ctx.runEffects();

    expect(sliceHistory.get(ctx.store.state)).toEqual({
      location: {
        pathname: '/foo',
        search: '',
      },
      pendingNavigation: {
        location: {
          pathname: '/foo',
        },
        preserve: true,
        replaceHistory: undefined,
      },
    });
  });

  test('goTo with browser', async () => {
    const ctx = setupSliceTestStore({
      slices: [sliceHistory],
      useMemoryHistory: false,
    });

    await ctx.runEffects();

    const { store } = ctx;

    store.dispatch(
      sliceHistory.actions.goTo({
        pathname: '/foo',
      }),
    );

    expect(sliceHistory.get(ctx.store.state)).toEqual({
      location: {
        pathname: '/',
        search: '',
      },
      pendingNavigation: {
        location: {
          pathname: '/foo',
        },
        preserve: true,
        replaceHistory: undefined,
      },
    });

    await ctx.runEffects();

    expect(sliceHistory.get(ctx.store.state)).toEqual({
      location: {
        pathname: '/foo',
        search: '',
      },
      pendingNavigation: {
        location: {
          pathname: '/foo',
        },
        preserve: true,
        replaceHistory: undefined,
      },
    });
  });

  test('navigation with replace history', async () => {
    const ctx = setupSliceTestStore({
      slices: [sliceHistory],
    });

    await ctx.runEffects();

    ctx.store.dispatch(
      sliceHistory.actions.goTo({ pathname: '/replace' }, true),
    );

    await ctx.runEffects();

    expect(sliceHistory.get(ctx.store.state)).toEqual({
      location: {
        pathname: '/replace',
        search: '',
      },
      pendingNavigation: {
        location: {
          pathname: '/replace',
        },
        preserve: true,
        replaceHistory: true,
      },
    });
  });

  test('navigation with search parameter', async () => {
    const ctx = setupSliceTestStore({
      slices: [sliceHistory],
    });

    await ctx.runEffects();

    ctx.store.dispatch(
      sliceHistory.actions.goTo({ pathname: '/search', search: 'query=test' }),
    );

    await ctx.runEffects();

    expect(sliceHistory.get(ctx.store.state)).toEqual({
      location: {
        pathname: '/search',
        search: 'query=test',
      },
      pendingNavigation: {
        location: {
          pathname: '/search',
          search: 'query=test',
        },
        preserve: true,
        replaceHistory: undefined,
      },
    });
  });

  test('cleanup function destroys history', async () => {
    const ctx = setupSliceTestStore({
      slices: [sliceHistory],
    });
    await ctx.runEffects();
    const history = createHistoryRef(ctx.store);

    ctx.store.destroy();

    expect(history.current).toBeUndefined();
  });
});

describe('sliceHistory with browser', () => {
  let historyPushSpy: jest.SpyInstance, historyReplaceSpy: jest.SpyInstance;

  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    jest.clearAllMocks();

    historyPushSpy = jest.spyOn(window.history, 'pushState');
    historyReplaceSpy = jest.spyOn(window.history, 'replaceState');
  });

  test('initial empty state with browser', async () => {
    const debugCalls = jest.fn();
    const ctx = setupSliceTestStore({
      slices: [sliceHistory],
      useMemoryHistory: false,
      debugCalls: debugCalls,
    });

    await ctx.runEffects();

    expect(sliceHistory.get(ctx.store.state)).toEqual({
      location: {
        pathname: '/',
        search: '',
      },
      pendingNavigation: undefined,
    });
  });

  test('reacts to external changes to history', async () => {
    const debugCalls = jest.fn();
    const ctx = setupSliceTestStore({
      slices: [sliceHistory],
      useMemoryHistory: false,
      debugCalls: debugCalls,
    });

    // run effects to setup the history
    await ctx.runEffects();

    window.history.pushState({ hello: '123' }, '', '/foo');
    expect(historyPushSpy).toHaveBeenCalledTimes(1);
    await sleep(10);

    expect(sliceHistory.get(ctx.store.state)).toEqual({
      location: {
        pathname: '/foo',
        search: '',
      },
      pendingNavigation: undefined,
    });
  });
});