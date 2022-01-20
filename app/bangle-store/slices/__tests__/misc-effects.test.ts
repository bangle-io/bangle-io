import { pageSlice } from '@bangle.io/slice-page';
import {
  goToWsNameRoute,
  updateOpenedWsPaths,
  workspaceSlice,
} from '@bangle.io/slice-workspace';
import { workspacesSlice } from '@bangle.io/slice-workspaces-manager';
import { createTestStore } from '@bangle.io/test-utils/create-test-store';
import { clearFakeIdb } from '@bangle.io/test-utils/fake-idb';
import * as idbHelpers from '@bangle.io/test-utils/indexedb-ws-helpers';
import { sleep } from '@bangle.io/utils';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { historySlice } from '../history-slice';
import { lastWorkspaceUsed, miscEffectsSlice } from '../misc-effects-slice';

jest.mock('idb-keyval', () => {
  const { fakeIdb } = jest.requireActual('@bangle.io/test-utils/fake-idb');
  return fakeIdb;
});

beforeEach(() => {
  idbHelpers.beforeEachHook();
});

afterEach(() => {
  idbHelpers.afterEachHook();
  clearFakeIdb();
});

describe('last seen workspace', () => {
  let originalLocalStorage;

  beforeEach(() => {
    originalLocalStorage = window.localStorage;
    let store = {};

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key) => {
          return store[key] || null;
        }),
        setItem: jest.fn((key, value) => {
          store[key] = value.toString();
        }),
        clear() {
          store = {};
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    (window as any).localStorage = originalLocalStorage;
  });

  describe('lastWorkspaceUsed functions', () => {
    test('works when not defined', () => {
      expect(lastWorkspaceUsed.get()).toBeUndefined();
    });

    test('works 1', () => {
      lastWorkspaceUsed.save('test-ws');

      expect(window.localStorage.setItem).toBeCalledTimes(1);
      expect(window.localStorage.setItem).nthCalledWith(
        1,
        'workspace-context/last-workspace-used',
        'test-ws',
      );

      expect(lastWorkspaceUsed.get()).toBe('test-ws');

      expect(window.localStorage.getItem).toBeCalledTimes(1);
    });
  });
  describe('slice', () => {
    beforeEach(() => {
      window.history.replaceState(null, '', '/');
    });
    test('saves last workspace used', async () => {
      let { store } = createTestStore([
        pageSlice(),
        historySlice(),
        workspaceSlice(),
        workspacesSlice(),
        miscEffectsSlice(),
      ]);

      updateOpenedWsPaths(() =>
        OpenedWsPaths.createFromArray(['test-ws:hello.md']),
      )(store.state, store.dispatch);

      await sleep(0);

      expect(window.localStorage.setItem).toBeCalledTimes(1);
      expect(window.localStorage.setItem).nthCalledWith(
        1,
        'workspace-context/last-workspace-used',
        'test-ws',
      );

      expect(lastWorkspaceUsed.get()).toEqual('test-ws');

      goToWsNameRoute('test-ws2')(store.state, store.dispatch);
      await sleep(0);

      expect(window.localStorage.setItem).toBeCalledTimes(2);
      expect(window.localStorage.setItem).nthCalledWith(
        2,
        'workspace-context/last-workspace-used',
        'test-ws2',
      );

      expect(lastWorkspaceUsed.get()).toEqual('test-ws2');
    });
  });
});
