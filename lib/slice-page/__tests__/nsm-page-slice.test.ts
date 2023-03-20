import { createDispatchSpy, Store, timeoutSchedular } from '@bangle.io/nsm';

import { nsmPageSlice } from '../nsm-page-slice';
import { lifeCycleMock } from './test-utils';

beforeEach(() => {
  lifeCycleMock.addEventListener.mockImplementation(() => {});
  lifeCycleMock.removeEventListener.mockImplementation(() => {});
});

export const createTestStore = () => {
  let dispatchSpy = createDispatchSpy();

  let store = Store.create({
    storeName: 'bangle-store',
    scheduler: timeoutSchedular(0),
    dispatchTx: dispatchSpy.dispatch,
    debug: dispatchSpy.debug,
    state: [nsmPageSlice],
  });

  return {
    store,
    dispatchSpy,
  };
};

test('sets up', () => {
  const { store } = createTestStore();

  expect(nsmPageSlice.getState(store.state)).toMatchInlineSnapshot(`
    {
      "blockReload": false,
      "lifeCycleState": {
        "current": undefined,
        "previous": undefined,
      },
      "location": {
        "pathname": undefined,
        "search": undefined,
      },
      "pendingNavigation": undefined,
    }
  `);
});

describe('updating state', () => {
  test('upload lifecycle', () => {
    const { store } = createTestStore();

    store.dispatch(
      nsmPageSlice.actions.setPageLifeCycleState({
        current: 'active',
        previous: 'frozen',
      }),
    );

    expect(nsmPageSlice.getState(store.state).lifeCycleState).toEqual({
      current: 'active',
      previous: 'frozen',
    });

    store.dispatch(
      nsmPageSlice.actions.setPageLifeCycleState({
        current: 'frozen',
        previous: 'active',
      }),
    );

    expect(nsmPageSlice.getState(store.state).lifeCycleState).toEqual({
      current: 'frozen',
      previous: 'active',
    });
  });

  test('blocking reload', () => {
    const { store } = createTestStore();

    store.dispatch(nsmPageSlice.actions.blockReload(true));

    expect(nsmPageSlice.getState(store.state).blockReload).toBe(true);

    store.dispatch(nsmPageSlice.actions.blockReload(false));
    expect(nsmPageSlice.getState(store.state).blockReload).toBe(false);
  });
});
