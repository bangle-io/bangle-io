import { BrowserHistory } from '@bangle.io/history';
import {
  goToLocation,
  pageSlice,
  PageSliceAction,
} from '@bangle.io/slice-page';
import { createTestStore } from '@bangle.io/test-utils/create-test-store';
import { sleep } from '@bangle.io/utils';

import { historySlice } from '../history-slice';

describe('watchHistoryEffect', () => {
  test('initializes & destroys correctly', async () => {
    jest.useFakeTimers();
    const { store, actionsDispatched } = createTestStore<PageSliceAction>([
      pageSlice(),
      historySlice(),
    ]);

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
  let historyPushSpy, historyReplaceSpy;

  beforeEach(() => {
    historyPushSpy = jest.spyOn(window.history, 'pushState');
    historyReplaceSpy = jest.spyOn(window.history, 'replaceState');
  });
  test('works', async () => {
    jest.useFakeTimers();

    const { store } = createTestStore<PageSliceAction>([
      pageSlice(),
      historySlice(),
    ]);

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
    jest.useFakeTimers();

    const { store } = createTestStore<PageSliceAction>([
      pageSlice(),
      historySlice(),
    ]);

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
    jest.useFakeTimers();

    const { store } = createTestStore<PageSliceAction>([
      pageSlice(),
      historySlice(),
    ]);

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
  test('works with object location', async () => {
    jest.useFakeTimers();

    const { store } = createTestStore<PageSliceAction>([
      pageSlice(),
      historySlice(),
    ]);

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
