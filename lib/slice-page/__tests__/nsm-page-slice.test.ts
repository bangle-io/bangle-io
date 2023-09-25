/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { setupTestStore } from '@bangle.io/test-utils-2';

import {
  blockReload,
  nsmPageSlice,
  setPageLifeCycleState,
} from '../nsm-page-slice';

const lifeCycleMock = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  removeUnsavedChanges: jest.fn(),
  addUnsavedChanges: jest.fn(),
};

let abort: AbortController;
beforeEach(() => {
  abort = new AbortController();
  lifeCycleMock.addEventListener.mockImplementation(() => {});
  lifeCycleMock.removeEventListener.mockImplementation(() => {});
});

afterEach(() => {
  abort?.abort();
});

test('sets up', () => {
  const { testStore } = setupTestStore({
    slices: [nsmPageSlice],
    abortSignal: abort.signal,
  });

  expect(nsmPageSlice.get(testStore.state)).toMatchInlineSnapshot(`
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
    const { testStore } = setupTestStore({
      slices: [nsmPageSlice],
      abortSignal: abort.signal,
    });

    testStore.dispatch(
      setPageLifeCycleState({
        current: 'active',
        previous: 'frozen',
      }),
    );

    expect(nsmPageSlice.get(testStore.state).lifeCycleState).toEqual({
      current: 'active',
      previous: 'frozen',
    });

    testStore.dispatch(
      setPageLifeCycleState({
        current: 'frozen',
        previous: 'active',
      }),
    );

    expect(nsmPageSlice.get(testStore.state).lifeCycleState).toEqual({
      current: 'frozen',
      previous: 'active',
    });
  });

  test('blocking reload', () => {
    const { testStore } = setupTestStore({
      slices: [nsmPageSlice],
      abortSignal: abort.signal,
    });

    testStore.dispatch(blockReload(true));

    expect(nsmPageSlice.get(testStore.state).blockReload).toBe(true);

    testStore.dispatch(blockReload(false));
    expect(nsmPageSlice.get(testStore.state).blockReload).toBe(false);
  });
});
