/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { BrowserHistory } from '@bangle.io/history';
import { goToLocation, pageSlice, pageSliceKey } from '@bangle.io/slice-page';
import {
  workspaceSliceInitialState,
  workspaceSliceKey,
} from '@bangle.io/slice-workspace';
import { createBareStore } from '@bangle.io/test-utils';

import { historySlice } from '../history-slice';

jest.mock('@bangle.io/slice-workspace', () => {
  const other = jest.requireActual('@bangle.io/slice-workspace');
  const workspaceSliceKey = other.workspaceSliceKey;
  workspaceSliceKey.getSliceStateAsserted = jest.fn();

  return {
    ...other,
    workspaceSliceKey,
  };
});

const workspaceStateMock = workspaceSliceKey[
  'getSliceStateAsserted'
] as jest.MockedFunction<(typeof workspaceSliceKey)['getSliceStateAsserted']>;

let historyPushSpy: jest.SpyInstance, historyReplaceSpy: jest.SpyInstance;

beforeAll(() => {
  jest.useFakeTimers();
});

beforeEach(() => {
  workspaceStateMock.mockImplementation(() => workspaceSliceInitialState);
  window.history.replaceState(null, '', '/');

  jest.clearAllMocks();

  historyPushSpy = jest.spyOn(window.history, 'pushState');
  historyReplaceSpy = jest.spyOn(window.history, 'replaceState');
});

describe('watchHistoryEffect', () => {
  test('initializes & destroys correctly', async () => {
    const { actionsDispatched } = createBareStore({
      sliceKey: pageSliceKey,
      slices: [pageSlice(), historySlice()],
    });

    expect(actionsDispatched).toContainEqual({
      id: expect.anything(),
      name: 'action::@bangle.io/bangle-store:history-slice-set-history',
      value: {
        history: expect.any(BrowserHistory),
      },
    });

    window.history.pushState(null, '', '/ws/foo');

    jest.runAllTimers();

    expect(actionsDispatched).toContainEqual({
      id: expect.anything(),
      name: 'action::@bangle.io/slice-page:history-update-location',
      value: {
        location: {
          pathname: '/ws/foo',
          search: '',
        },
      },
    });
  });
});

describe('applyPendingNavigation', () => {
  test('works', async () => {
    jest.useFakeTimers();
    const { store } = createBareStore({
      slices: [pageSlice(), historySlice()],
      sliceKey: pageSliceKey,
    });

    goToLocation('/ws/home')(store.state, store.dispatch);
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
    const { store } = createBareStore({
      slices: [pageSlice(), historySlice()],
      sliceKey: pageSliceKey,
    });

    goToLocation('/ws/home', { replace: true })(store.state, store.dispatch);
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
    const { store } = createBareStore({
      slices: [pageSlice(), historySlice()],
      sliceKey: pageSliceKey,
    });

    goToLocation(
      {
        pathname: '/ws/home/my-note.md',
        search: 'secondary=garden2%253A1-rule.md',
      },
      { replace: true },
    )(store.state, store.dispatch);
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
    const { store } = createBareStore({
      slices: [pageSlice(), historySlice()],
      sliceKey: pageSliceKey,
    });

    goToLocation(`/ws/home/my-note.md?secondary=garden2%253A1-rule.md`, {
      replace: true,
    })(store.state, store.dispatch);
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
    const { store } = createBareStore({
      slices: [pageSlice(), historySlice()],
      sliceKey: pageSliceKey,
    });

    goToLocation(
      {
        pathname: '/ws/home/my-note.md',
        search: 'secondary=garden2%253A1-rule.md',
      },
      {},
    )(store.state, store.dispatch);
    jest.runAllTimers();

    expect(historyPushSpy).toBeCalledTimes(1);
    expect(historyPushSpy).nthCalledWith(
      1,
      { key: 0, value: null },
      '',
      '/ws/home/my-note.md?secondary=garden2%253A1-rule.md',
    );
    expect(historyReplaceSpy).toBeCalledTimes(0);

    // dispatching any other action does not trigger history
    store.dispatch({ name: 'action::some-action' } as any);

    jest.runAllTimers();

    expect(historyPushSpy).toBeCalledTimes(1);
  });
});
