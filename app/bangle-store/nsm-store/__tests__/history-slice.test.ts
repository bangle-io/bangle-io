/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { createTestDebugger, Store, timeoutSchedular } from '@bangle.io/nsm';
import { nsmPageSlice } from '@bangle.io/slice-page';

import { historySliceFamily } from '../history-slice';

jest.mock('@bangle.io/slice-workspace', () => {
  const other = jest.requireActual('@bangle.io/slice-workspace');
  const workspaceSliceKey = other.workspaceSliceKey;
  workspaceSliceKey.getSliceStateAsserted = jest.fn();

  return {
    ...other,
    workspaceSliceKey,
  };
});

let historyPushSpy: jest.SpyInstance, historyReplaceSpy: jest.SpyInstance;

beforeAll(() => {
  jest.useFakeTimers();
});

beforeEach(() => {
  window.history.replaceState(null, '', '/');

  jest.clearAllMocks();

  historyPushSpy = jest.spyOn(window.history, 'pushState');
  historyReplaceSpy = jest.spyOn(window.history, 'replaceState');
});

describe('watchHistoryEffect', () => {
  test('initializes & destroys correctly', async () => {
    let testSpy = createTestDebugger();

    let store = Store.create({
      storeName: 'bangle-store',
      scheduler: timeoutSchedular(0),
      dispatchTx: testSpy.dispatch,
      debug: testSpy.debug,
      state: [nsmPageSlice, ...historySliceFamily],
    });

    window.history.pushState(null, '', '/ws/foo');

    jest.runAllTimers();

    expect(
      testSpy.getSimplifiedTransactions({
        filterBySource: [nsmPageSlice],
      }),
    ).toEqual([
      {
        actionId: 'syncPageLocation',
        dispatchSource: 'l_watchHistoryEffect$',
        payload: [
          {
            pathname: '/ws/foo',
            search: '',
          },
        ],
        sourceSliceLineage: 'l_bangle/page-slice$',
        targetSliceLineage: 'l_bangle/page-slice$',
      },
    ]);
  });
});

describe('applyPendingNavigation', () => {
  const createTestStore = () => {
    let testSpy = createTestDebugger();

    let store = Store.create({
      storeName: 'bangle-store',
      scheduler: timeoutSchedular(0),
      dispatchTx: testSpy.dispatch,
      debug: testSpy.debug,
      state: [nsmPageSlice, ...historySliceFamily],
    });

    return {
      store,
      testSpy: testSpy,
    };
  };
  beforeAll(() => {
    jest.useFakeTimers();
  });
  test('works', async () => {
    const { store } = createTestStore();

    store.dispatch(nsmPageSlice.actions.goToLocation({ location: '/ws/home' }));

    jest.runAllTimers();

    expect(historyPushSpy).toBeCalledTimes(1);
    expect(historyPushSpy).nthCalledWith(
      1,
      { key: 0, value: null },
      '',
      '/ws/home',
    );
    expect(historyReplaceSpy).toBeCalledTimes(0);
  });

  test('respects replace', async () => {
    const { store } = createTestStore();

    store.dispatch(
      nsmPageSlice.actions.goToLocation({
        location: '/ws/home',
        replace: true,
      }),
    );

    jest.runAllTimers();

    expect(historyReplaceSpy).toBeCalledTimes(1);
    expect(historyReplaceSpy).nthCalledWith(
      1,
      { key: 0, value: null },
      '',
      '/ws/home',
    );
    expect(historyPushSpy).toBeCalledTimes(0);
  });

  test('works with object location and replace=true', async () => {
    const { store } = createTestStore();

    store.dispatch(
      nsmPageSlice.actions.goToLocation({
        location: {
          pathname: '/ws/home/my-note.md',
          search: 'secondary=garden2%253A1-rule.md',
        },
        replace: true,
      }),
    );

    jest.runAllTimers();

    expect(historyReplaceSpy).toBeCalledTimes(1);
    expect(historyReplaceSpy).nthCalledWith(
      1,
      { key: 0, value: null },
      '',
      '/ws/home/my-note.md?secondary=garden2%253A1-rule.md',
    );
    expect(historyPushSpy).toBeCalledTimes(0);
  });

  test('works when location is string', async () => {
    const { store } = createTestStore();

    store.dispatch(
      nsmPageSlice.actions.goToLocation({
        location: `/ws/home/my-note.md?secondary=garden2%253A1-rule.md`,
        replace: true,
      }),
    );

    jest.runAllTimers();

    expect(historyReplaceSpy).toBeCalledTimes(1);
    expect(historyReplaceSpy).nthCalledWith(
      1,
      { key: 0, value: null },
      '',
      '/ws/home/my-note.md?secondary=garden2%253A1-rule.md',
    );
    expect(historyPushSpy).toBeCalledTimes(0);
  });

  test('works with object location', async () => {
    const { store } = createTestStore();

    store.dispatch(
      nsmPageSlice.actions.goToLocation({
        location: {
          pathname: '/ws/home/my-note.md',
          search: 'secondary=garden2%253A1-rule.md',
        },
      }),
    );

    jest.runAllTimers();

    expect(historyPushSpy).toBeCalledTimes(1);
    expect(historyPushSpy).nthCalledWith(
      1,
      { key: 0, value: null },
      '',
      '/ws/home/my-note.md?secondary=garden2%253A1-rule.md',
    );
    expect(historyReplaceSpy).toBeCalledTimes(0);
  });
});
