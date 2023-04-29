import lifeCycle from 'page-lifecycle';

import { createDispatchSpy, Store, timeoutSchedular } from '@bangle.io/nsm';
import { nsmPageSlice } from '@bangle.io/slice-page';
import { waitForExpect } from '@bangle.io/test-utils';
import { sleep } from '@bangle.io/utils';

import {
  pageLifeCycleBlockReload,
  pageLifeCycleWatch,
} from '../page-lifecycle-slice';

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
    let store = Store.create({
      storeName: 'bangle-store',
      scheduler: timeoutSchedular(0),
      state: [nsmPageSlice, pageLifeCycleBlockReload],
    });
    const { dispatch } = store;

    expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(0);

    dispatch(nsmPageSlice.actions.blockReload(true));
    await sleep(0);

    expect(lifeCycleMock.removeUnsavedChanges).toBeCalledTimes(0);
    expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(1);

    dispatch(nsmPageSlice.actions.blockReload(false));
    await sleep(0);

    expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(1);
    expect(lifeCycleMock.removeUnsavedChanges).toBeCalledTimes(1);
  });

  test('repeat calling does not affect', async () => {
    let store = Store.create({
      storeName: 'bangle-store',
      scheduler: timeoutSchedular(0),
      state: [nsmPageSlice, pageLifeCycleBlockReload],
    });
    const { dispatch } = store;

    dispatch(nsmPageSlice.actions.blockReload(true));
    dispatch(nsmPageSlice.actions.blockReload(true));
    dispatch(nsmPageSlice.actions.blockReload(true));

    await sleep(0);

    expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(1);
    expect(lifeCycleMock.removeUnsavedChanges).toBeCalledTimes(0);

    dispatch(nsmPageSlice.actions.blockReload(false));
    dispatch(nsmPageSlice.actions.blockReload(false));

    await sleep(0);

    expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(1);
    expect(lifeCycleMock.removeUnsavedChanges).toBeCalledTimes(1);

    dispatch(nsmPageSlice.actions.blockReload(true));
    await sleep(0);
    dispatch(nsmPageSlice.actions.blockReload(false));
    await sleep(0);
    dispatch(nsmPageSlice.actions.blockReload(true));
    await sleep(0);
    dispatch(nsmPageSlice.actions.blockReload(false));
    await sleep(0);

    expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(3);
    expect(lifeCycleMock.removeUnsavedChanges).toBeCalledTimes(3);
  });
});

describe('watchPageLifeCycleEffect', () => {
  test('initializes & destroys correctly', async () => {
    let testSpy = createTestDebugger();

    let store = Store.create({
      storeName: 'bangle-store',
      dispatchTx: testSpy.dispatch,
      scheduler: timeoutSchedular(0),
      state: [nsmPageSlice, pageLifeCycleBlockReload, pageLifeCycleWatch],
    });
    const { dispatch } = store;

    await waitForExpect(() => {
      expect(lifeCycleMock.addEventListener).toBeCalledTimes(1);
      expect(lifeCycleMock.addEventListener).nthCalledWith(
        1,
        'statechange',
        expect.any(Function),
      );
    });

    expect(
      testSpy
        .getSimplifiedTransactions()
        .find((r) => r.actionId === 'setPageLifeCycleState'),
    ).toEqual({
      actionId: 'setPageLifeCycleState',
      dispatchSource: 'l_pageLifeCycleWatch$',
      payload: [
        {
          current: 'active',
          previous: undefined,
        },
      ],
      sourceSliceLineage: 'l_bangle/page-slice$',
      targetSliceLineage: 'l_bangle/page-slice$',
    });

    store?.destroy();

    expect(lifeCycleMock.removeEventListener).toBeCalledTimes(1);
    expect(lifeCycleMock.removeEventListener).nthCalledWith(
      1,
      'statechange',
      expect.any(Function),
    );
  });

  test('dispatches correctly', async () => {
    let testSpy = createTestDebugger();

    let store = Store.create({
      storeName: 'bangle-store',
      dispatchTx: testSpy.dispatch,
      scheduler: timeoutSchedular(0),
      state: [nsmPageSlice, pageLifeCycleBlockReload, pageLifeCycleWatch],
    });
    const { dispatch } = store;

    await waitForExpect(() => {
      expect(lifeCycleMock.addEventListener).toBeCalledTimes(1);
    });

    let cb = (lifeCycleMock.addEventListener as any).mock.calls[0][1];

    cb({ newState: 'active', oldState: 'passive' });

    expect(
      testSpy
        .getSimplifiedTransactions()
        .filter((r) => r.actionId === 'setPageLifeCycleState')
        .map((r) => r.payload),
    ).toEqual([
      [
        {
          current: 'active',
          previous: undefined,
        },
      ],
      [
        {
          current: 'active',
          previous: 'passive',
        },
      ],
    ]);
  });
});
