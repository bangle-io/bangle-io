/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { store } from '@bangle.io/nsm-3';
import { goToLocation, nsmPageSlice } from '@bangle.io/slice-page';

import { historyEffects, historySlice } from '../history-slice';

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

const setupStore = () => {
  let testSpy = jest.fn();

  let myStore = store({
    storeName: 'bangle-store',
    debug: testSpy,
    slices: [nsmPageSlice, historySlice],
  });

  historyEffects.forEach((effect) => {
    myStore.registerEffect(effect);
  });

  return {
    store: myStore,
    testSpy: testSpy,
  };
};
describe('watchHistoryEffect', () => {
  test('initializes & destroys correctly', async () => {
    let setup = setupStore();

    window.history.pushState(null, '', '/ws/foo');

    jest.runAllTimers();

    expect(
      setup.testSpy.mock.calls.filter((call) => {
        return call[0]?.type.includes('EFFECT');
      }),
    ).toMatchInlineSnapshot(`
      [
        [
          {
            "changed": "",
            "name": "pendingNavEffect",
            "type": "SYNC_UPDATE_EFFECT",
          },
        ],
        [
          {
            "changed": "",
            "name": "watchHistoryEffect",
            "type": "UPDATE_EFFECT",
          },
        ],
        [
          {
            "changed": "history",
            "name": "pendingNavEffect",
            "type": "SYNC_UPDATE_EFFECT",
          },
        ],
        [
          {
            "changed": "",
            "name": "saveWorkspaceInfoEffect",
            "type": "UPDATE_EFFECT",
          },
        ],
      ]
    `);
  });
});

describe('applyPendingNavigation', () => {
  const createTestStore = () => {
    return setupStore();
  };
  beforeAll(() => {
    jest.useFakeTimers();
  });
  test('works', async () => {
    const { store } = createTestStore();

    store.dispatch(goToLocation({ location: '/ws/home' }));

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
      goToLocation({
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
      goToLocation({
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
      goToLocation({
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
      goToLocation({
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
