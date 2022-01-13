import { blockReload, pageSlice, PageSliceAction } from '@bangle.io/slice-page';
import { createTestStore } from '@bangle.io/test-utils/create-test-store';
import { sleep } from '@bangle.io/utils';

import { pageLifeCycleSlice } from '../page-lifecycle';

export const lifeCycleMock = {
  state: 'active' as const,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  removeUnsavedChanges: jest.fn(),
  addUnsavedChanges: jest.fn(),
};

beforeEach(() => {
  lifeCycleMock.addEventListener.mockImplementation(() => {});
  lifeCycleMock.removeEventListener.mockImplementation(() => {});
  lifeCycleMock.removeUnsavedChanges.mockImplementation(() => {});
  lifeCycleMock.addUnsavedChanges.mockImplementation(() => {});
});

describe('blockReloadEffect', () => {
  test('blocks', async () => {
    const { store } = createTestStore<PageSliceAction>([
      pageSlice(),
      pageLifeCycleSlice(lifeCycleMock),
    ]);
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
    const { store } = createTestStore([
      pageSlice(),
      pageLifeCycleSlice(lifeCycleMock),
    ]);

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
    const { store, actionsDispatched } = createTestStore<PageSliceAction>([
      pageSlice(),
      pageLifeCycleSlice(lifeCycleMock),
    ]);
    expect(lifeCycleMock.addEventListener).toBeCalledTimes(1);
    expect(lifeCycleMock.addEventListener).nthCalledWith(
      1,
      'statechange',
      expect.any(Function),
    );

    // dispatches the current state on mount
    expect(actionsDispatched).toContainEqual({
      id: expect.any(String),
      name: 'action::@bangle.io/slice-page:UPDATE_PAGE_LIFE_CYCLE_STATE',
      value: {
        current: 'active',
        previous: undefined,
      },
    });

    store.destroy();

    expect(lifeCycleMock.removeEventListener).toBeCalledTimes(1);

    expect(lifeCycleMock.removeEventListener).nthCalledWith(
      1,
      'statechange',
      expect.any(Function),
    );
  });

  test('dispatches correctly', () => {
    const { store, dispatchSpy } = createTestStore<PageSliceAction>([
      pageSlice(),
      pageLifeCycleSlice(lifeCycleMock),
    ]);

    expect(lifeCycleMock.addEventListener).toBeCalledTimes(1);
    let cb = lifeCycleMock.addEventListener.mock.calls[0][1];

    cb({ newState: 'active', oldState: 'passive' });
    expect(dispatchSpy).toBeCalled();
    expect(dispatchSpy).toBeCalledWith({
      id: expect.anything(),
      name: 'action::@bangle.io/slice-page:UPDATE_PAGE_LIFE_CYCLE_STATE',
      value: {
        current: 'active',
        previous: 'passive',
      },
    });
  });
});
