import lifeCycle from 'page-lifecycle';

import { store as createStore } from '@bangle.io/nsm-3';
import { blockReload, nsmPageSlice } from '@bangle.io/slice-page';
import { waitForExpect } from '@bangle.io/test-utils';
import { sleep } from '@bangle.io/utils';
import {
  pageLifeCycleBlockReload,
  pageLifeCycleEffects,
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
    let store = createStore({
      storeName: 'bangle-store',
      slices: [nsmPageSlice],
    });

    store.registerEffect(pageLifeCycleBlockReload);

    const { dispatch } = store;

    expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(0);

    dispatch(blockReload(true));
    await sleep(0);

    expect(lifeCycleMock.removeUnsavedChanges).toBeCalledTimes(0);
    expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(1);

    dispatch(blockReload(false));
    await sleep(0);

    expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(1);
    expect(lifeCycleMock.removeUnsavedChanges).toBeCalledTimes(1);
  });

  test('repeat calling does not affect', async () => {
    let store = createStore({
      storeName: 'bangle-store',
      slices: [nsmPageSlice],
    });
    store.registerEffect(pageLifeCycleBlockReload);

    const { dispatch } = store;

    dispatch(blockReload(true));
    dispatch(blockReload(true));
    dispatch(blockReload(true));

    await sleep(0);

    expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(1);
    expect(lifeCycleMock.removeUnsavedChanges).toBeCalledTimes(0);

    dispatch(blockReload(false));
    dispatch(blockReload(false));

    await sleep(0);

    expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(1);
    expect(lifeCycleMock.removeUnsavedChanges).toBeCalledTimes(1);

    dispatch(blockReload(true));
    await sleep(0);
    dispatch(blockReload(false));
    await sleep(0);
    dispatch(blockReload(true));
    await sleep(0);
    dispatch(blockReload(false));
    await sleep(0);

    expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(3);
    expect(lifeCycleMock.removeUnsavedChanges).toBeCalledTimes(3);
  });
});

describe('watchPageLifeCycleEffect', () => {
  test('initializes & destroys correctly', async () => {
    let testSpy = jest.fn();

    let store = createStore({
      debug: testSpy,
      storeName: 'bangle-store',
      slices: [nsmPageSlice],
    });

    pageLifeCycleEffects.forEach((effect) => {
      store.registerEffect(effect);
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

    const calls = testSpy.mock.calls
      .filter((r) => r[0].type === 'TRANSACTION')
      .map((r) => {
        return r.map((rr) => {
          return {
            ...rr,
            txId: undefined,
          };
        });
      });

    expect(calls).toEqual([
      [
        {
          actionId: 'a_setPageLifeCycleState[sl_bangle/page-slice$]1',
          dispatcher: 'pageLifeCycleWatch',
          params: [
            {
              current: 'active',
              previous: undefined,
            },
          ],
          sourceSlices: 'sl_bangle/page-slice$',
          store: 'bangle-store',
          targetSlices: 'sl_bangle/page-slice$',
          txId: undefined,
          type: 'TRANSACTION',
        },
      ],
    ]);

    store?.destroy();

    expect(lifeCycleMock.removeEventListener).toBeCalledTimes(1);
    expect(lifeCycleMock.removeEventListener).nthCalledWith(
      1,
      'statechange',
      expect.any(Function),
    );
  });

  test('dispatches correctly', async () => {
    let testSpy = jest.fn();

    let store = createStore({
      storeName: 'bangle-store',
      debug: testSpy,
      slices: [nsmPageSlice],
    });

    pageLifeCycleEffects.forEach((effect) => {
      store.registerEffect(effect);
    });

    const { dispatch } = store;

    await waitForExpect(() => {
      expect(lifeCycleMock.addEventListener).toBeCalledTimes(1);
    });

    let cb = (lifeCycleMock.addEventListener as any).mock.calls[0][1];

    cb({ newState: 'active', oldState: 'passive' });

    const calls = testSpy.mock.calls
      .filter((r) => r[0].type === 'TRANSACTION')
      .map((r) => {
        return r.map((rr) => {
          return {
            ...rr,
            txId: undefined,
          };
        });
      });
    expect(calls).toMatchInlineSnapshot(`
      [
        [
          {
            "actionId": "a_setPageLifeCycleState[sl_bangle/page-slice$]1",
            "dispatcher": "pageLifeCycleWatch",
            "params": [
              {
                "current": "active",
                "previous": undefined,
              },
            ],
            "sourceSlices": "sl_bangle/page-slice$",
            "store": "bangle-store",
            "targetSlices": "sl_bangle/page-slice$",
            "txId": undefined,
            "type": "TRANSACTION",
          },
        ],
        [
          {
            "actionId": "a_setPageLifeCycleState[sl_bangle/page-slice$]1",
            "dispatcher": "pageLifeCycleWatch",
            "params": [
              {
                "current": "active",
                "previous": "passive",
              },
            ],
            "sourceSlices": "sl_bangle/page-slice$",
            "store": "bangle-store",
            "targetSlices": "sl_bangle/page-slice$",
            "txId": undefined,
            "type": "TRANSACTION",
          },
        ],
      ]
    `);
  });
});
