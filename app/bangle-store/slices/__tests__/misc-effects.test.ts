/**
 * @jest-environment jsdom
 */
import { pageSlice } from '@bangle.io/slice-page';
import {
  goToWsNameRoute,
  updateOpenedWsPaths,
  workspaceSlice,
} from '@bangle.io/slice-workspace';
import { setupMockWorkspaceWithNotes } from '@bangle.io/test-basic-store';
import { createTestStore } from '@bangle.io/test-utils/create-test-store';
import { sleep } from '@bangle.io/utils';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { historySlice } from '../history-slice';
import { lastWorkspaceUsed, miscEffectsSlice } from '../misc-effects-slice';

describe('last seen workspace', () => {
  let originalLocalStorage;

  beforeEach(() => {
    originalLocalStorage = global.localStorage;
    let store = {};

    Object.defineProperty(global, 'localStorage', {
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
    (global as any).localStorage = originalLocalStorage;
  });

  describe('lastWorkspaceUsed functions', () => {
    test('works when not defined', () => {
      expect(lastWorkspaceUsed.get()).toBeUndefined();
    });

    test('works 1', () => {
      lastWorkspaceUsed.save('test-ws');

      expect(global.localStorage.setItem).toBeCalledTimes(1);
      expect(global.localStorage.setItem).nthCalledWith(
        1,
        'workspace-context/last-workspace-used',
        'test-ws',
      );

      expect(lastWorkspaceUsed.get()).toBe('test-ws');

      expect(global.localStorage.getItem).toBeCalledTimes(1);
    });
  });
  describe('slice', () => {
    beforeEach(() => {
      global.history.replaceState(null, '', '/');
    });

    test('saves last workspace used', async () => {
      // fill db with existing data
      (
        await setupMockWorkspaceWithNotes(undefined, 'test-ws', [
          ['test-ws:hello.md', `hello world`],
        ])
      ).store.destroy();

      await sleep(0);

      let { store } = createTestStore([
        pageSlice(),
        historySlice(),
        workspaceSlice(),
        miscEffectsSlice(),
      ]);

      updateOpenedWsPaths(() =>
        OpenedWsPaths.createFromArray(['test-ws:hello.md']),
      )(store.state, store.dispatch);

      await sleep(0);

      expect(global.localStorage.setItem).toBeCalledTimes(1);
      expect(global.localStorage.setItem).nthCalledWith(
        1,
        'workspace-context/last-workspace-used',
        'test-ws',
      );

      expect(lastWorkspaceUsed.get()).toEqual('test-ws');
      // going to a not existing workspace should not be saved
      goToWsNameRoute('test-ws2')(store.state, store.dispatch);
      await sleep(0);

      expect(global.localStorage.setItem).toBeCalledTimes(1);

      expect(lastWorkspaceUsed.get()).toEqual('test-ws');
    });

    test('going through multiple workspaces', async () => {
      // fill db with existing data
      (
        await setupMockWorkspaceWithNotes(undefined, 'test-ws-1', [
          ['test-ws-1:hello.md', `hello world`],
        ])
      ).store.destroy();
      (
        await setupMockWorkspaceWithNotes(undefined, 'test-ws-2', [
          ['test-ws-2:hello.md', `hello world`],
        ])
      ).store.destroy();

      await sleep(0);

      let { store } = createTestStore([
        pageSlice(),
        historySlice(),
        workspaceSlice(),
        miscEffectsSlice(),
      ]);

      goToWsNameRoute('test-ws-1')(store.state, store.dispatch);
      await sleep(0);
      expect(lastWorkspaceUsed.get()).toEqual('test-ws-1');

      goToWsNameRoute('test-ws-2')(store.state, store.dispatch);
      await sleep(0);

      expect(lastWorkspaceUsed.get()).toEqual('test-ws-2');
    });
  });
});
