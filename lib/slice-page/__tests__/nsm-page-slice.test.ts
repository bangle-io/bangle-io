import { store } from '@bangle.io/nsm-3';

import {
  blockReload,
  nsmPageSlice,
  setPageLifeCycleState,
} from '../nsm-page-slice';
import { lifeCycleMock } from './test-utils';

beforeEach(() => {
  lifeCycleMock.addEventListener.mockImplementation(() => {});
  lifeCycleMock.removeEventListener.mockImplementation(() => {});
});

export const createTestStore = () => {
  const testSpy = jest.fn();
  let myStore = store({
    storeName: 'bangle-store',
    debug: testSpy,
    slices: [nsmPageSlice],
  });

  return {
    store: myStore,
    testSpy: testSpy,
  };
};

test('sets up', () => {
  const { store } = createTestStore();

  expect(nsmPageSlice.get(store.state)).toMatchInlineSnapshot(`
    {
      "blockReload": false,
      "currentPageLifeCycle": undefined,
      "isInactivePage": false,
      "lifeCycleState": {
        "current": undefined,
        "previous": undefined,
      },
      "location": {
        "pathname": undefined,
        "search": undefined,
      },
      "pendingNavigation": undefined,
      "primaryWsPath": undefined,
      "rawPrimaryWsPath": undefined,
      "rawSecondaryWsPath": undefined,
      "secondaryWsPath": undefined,
      "wsName": undefined,
    }
  `);
});

describe('updating state', () => {
  test('upload lifecycle', () => {
    const { store } = createTestStore();

    store.dispatch(
      setPageLifeCycleState({
        current: 'active',
        previous: 'frozen',
      }),
    );

    expect(nsmPageSlice.get(store.state).lifeCycleState).toEqual({
      current: 'active',
      previous: 'frozen',
    });

    store.dispatch(
      setPageLifeCycleState({
        current: 'frozen',
        previous: 'active',
      }),
    );

    expect(nsmPageSlice.get(store.state).lifeCycleState).toEqual({
      current: 'frozen',
      previous: 'active',
    });
  });

  test('blocking reload', () => {
    const { store } = createTestStore();

    store.dispatch(blockReload(true));

    expect(nsmPageSlice.get(store.state).blockReload).toBe(true);

    store.dispatch(blockReload(false));
    expect(nsmPageSlice.get(store.state).blockReload).toBe(false);
  });
});
