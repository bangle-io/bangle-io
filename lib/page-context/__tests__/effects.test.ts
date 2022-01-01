import { sleep } from '@bangle.io/utils';

import { blockReload, pageSlice } from '..';
import { BrowserHistory } from '../history/browser-histroy';
import { createStore, lifeCycleMock } from './test-utils';

beforeEach(() => {
  lifeCycleMock.addEventListener.mockImplementation(() => {});
  lifeCycleMock.removeEventListener.mockImplementation(() => {});
});

describe('blockReloadEffect', () => {
  test('blocks', async () => {
    const { store } = createStore();
    expect(lifeCycleMock.removeUnsavedChanges).toBeCalledTimes(0);
    expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(0);

    blockReload(true)(store.state, store.dispatch);
    await sleep(0);

    expect(lifeCycleMock.removeUnsavedChanges).toBeCalledTimes(0);
    expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(1);

    blockReload(false)(store.state, store.dispatch);
    await sleep(0);

    expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(1);
    expect(lifeCycleMock.removeUnsavedChanges).toBeCalledTimes(1);
  });

  test('repeat calling does not affect', async () => {
    const { store } = createStore();

    blockReload(true)(store.state, store.dispatch);
    blockReload(true)(store.state, store.dispatch);
    blockReload(true)(store.state, store.dispatch);

    await sleep(0);

    expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(1);
    expect(lifeCycleMock.removeUnsavedChanges).toBeCalledTimes(0);

    blockReload(false)(store.state, store.dispatch);
    blockReload(false)(store.state, store.dispatch);

    expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(1);
    expect(lifeCycleMock.removeUnsavedChanges).toBeCalledTimes(1);

    blockReload(true)(store.state, store.dispatch);
    blockReload(false)(store.state, store.dispatch);
    blockReload(true)(store.state, store.dispatch);
    blockReload(false)(store.state, store.dispatch);

    expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(3);
    expect(lifeCycleMock.removeUnsavedChanges).toBeCalledTimes(3);
  });
});

describe('watchPageLifeCycleEffect', () => {
  test('initializes & destroys correctly', () => {
    const { store } = createStore();
    expect(lifeCycleMock.addEventListener).toBeCalledTimes(1);
    expect(lifeCycleMock.addEventListener).nthCalledWith(
      1,
      'statechange',
      expect.any(Function),
    );

    store.destroy();

    expect(lifeCycleMock.removeEventListener).toBeCalledTimes(1);

    expect(lifeCycleMock.removeEventListener).nthCalledWith(
      1,
      'statechange',
      expect.any(Function),
    );
  });

  test('dispatches correctly', () => {
    const { store, dispatchSpy } = createStore();

    expect(lifeCycleMock.addEventListener).toBeCalledTimes(1);
    let cb = lifeCycleMock.addEventListener.mock.calls[0][1];

    cb({ newState: 'active', oldState: 'passive' });
    expect(dispatchSpy).toBeCalled();
    expect(dispatchSpy).toBeCalledWith({
      id: expect.anything(),
      name: 'action::page-slice:UPDATE_PAGE_LIFE_CYCLE_STATE',
      value: {
        current: 'active',
        previous: 'passive',
      },
    });
  });
});

describe('watchHistoryEffect', () => {
  test('initializes & destroys correctly', async () => {
    jest.useFakeTimers();
    const { actionsDispatched } = createStore();

    expect(actionsDispatched).toHaveLength(1);

    expect(actionsDispatched).toEqual([
      {
        id: expect.anything(),
        name: 'action::page-slice:history-set-history',
        value: {
          history: expect.any(BrowserHistory),
        },
      },
    ]);

    window.history.pushState(null, '', '/ws/foo');

    jest.runAllTimers();

    expect(actionsDispatched).toHaveLength(2);
    expect(actionsDispatched[1]).toEqual({
      id: expect.anything(),
      name: 'action::page-slice:history-update-location',
      value: {
        location: {
          pathname: '/ws/foo',
          search: '',
        },
      },
    });
  });
});
