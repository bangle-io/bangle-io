import lifeCycle from 'page-lifecycle';

import { blockReload, pageSlice, pageSliceKey } from '@bangle.io/slice-page';
import { createBareStore } from '@bangle.io/test-utils';
import { sleep } from '@bangle.io/utils';

import { pageLifeCycleSlice } from '../page-lifecycle-slice';

jest.mock('page-lifecycle', () => {
  return {
    state: 'active' as const,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    removeUnsavedChanges: jest.fn(),
    addUnsavedChanges: jest.fn(),
  };
});

let lifeCycleMock = lifeCycle;

beforeEach(() => {
  (lifeCycleMock.addEventListener as any).mockImplementation(() => {});
  (lifeCycleMock.removeEventListener as any).mockImplementation(() => {});
  (lifeCycleMock.removeUnsavedChanges as any).mockImplementation(() => {});
  (lifeCycleMock.addUnsavedChanges as any).mockImplementation(() => {});
});

describe('blockReloadEffect', () => {
  test('blocks', async () => {
    const { store } = createBareStore({
      sliceKey: pageSliceKey,
      slices: [pageSlice(), pageLifeCycleSlice()],
    });
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
    const { store } = createBareStore({
      slices: [pageSlice(), pageLifeCycleSlice()],
    });

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
    const { store, actionsDispatched } = createBareStore({
      sliceKey: pageSliceKey,
      slices: [pageSlice(), pageLifeCycleSlice()],
    });
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

    store?.destroy();

    expect(lifeCycleMock.removeEventListener).toBeCalledTimes(1);

    expect(lifeCycleMock.removeEventListener).nthCalledWith(
      1,
      'statechange',
      expect.any(Function),
    );
  });

  test('dispatches correctly', () => {
    const { store } = createBareStore({
      sliceKey: pageSliceKey,
      slices: [pageSlice(), pageLifeCycleSlice()],
    });

    const dispatchSpy = jest.spyOn(store, 'dispatch');

    expect(lifeCycleMock.addEventListener).toBeCalledTimes(1);
    let cb = (lifeCycleMock.addEventListener as any).mock.calls[0][1];

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
