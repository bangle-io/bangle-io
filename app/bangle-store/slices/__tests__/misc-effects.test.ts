/**
 * @jest-environment @bangle.io/jsdom-env
 */

import {
  goToWsNameRoute,
  updateOpenedWsPaths,
} from '@bangle.io/slice-workspace';
import {
  createBasicTestStore,
  setupMockWorkspaceWithNotes,
  waitForExpect,
} from '@bangle.io/test-utils';
import { sleep } from '@bangle.io/utils';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { historySlice } from '../history-slice';
import { lastWorkspaceUsed, miscEffectsSlice } from '../misc-effects-slice';

describe('last seen workspace', () => {
  let originalLocalStorage: typeof localStorage;

  beforeEach(() => {
    originalLocalStorage = global.localStorage;
    let localDb: any = {};

    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: jest.fn((key) => {
          return localDb[key] || null;
        }),
        setItem: jest.fn((key, value) => {
          localDb[key] = value.toString();
        }),
        clear() {
          localDb = {};
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

    test('works 1', async () => {
      lastWorkspaceUsed.save('test-ws');

      await waitForExpect(() => {
        expect(global.localStorage.setItem).toBeCalledTimes(1);
      });

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
        await setupMockWorkspaceWithNotes(
          createBasicTestStore({}).store,
          'test-ws',
          [['test-ws:hello.md', `hello world`]],
        )
      ).store?.destroy();

      await sleep(0);

      let { store } = createBasicTestStore({
        slices: [historySlice(), miscEffectsSlice()],
        useMemoryHistorySlice: false,
      });

      updateOpenedWsPaths(() =>
        OpenedWsPaths.createFromArray(['test-ws:hello.md']),
      )(store.state, store.dispatch);

      await waitForExpect(() => {
        expect(global.localStorage.setItem).toBeCalledTimes(1);
      });

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
      (
        await setupMockWorkspaceWithNotes(
          createBasicTestStore({}).store,
          'test-ws-1',
          [['test-ws-1:hello.md', `hello world`]],
        )
      ).store?.destroy();
      (
        await setupMockWorkspaceWithNotes(
          createBasicTestStore({}).store,
          'test-ws-2',
          [['test-ws-2:hello.md', `hello world`]],
        )
      ).store?.destroy();

      await sleep(0);

      let { store } = createBasicTestStore({
        slices: [historySlice(), miscEffectsSlice()],
        useMemoryHistorySlice: false,
      });

      goToWsNameRoute('test-ws-1')(store.state, store.dispatch);
      await waitForExpect(() => {
        expect(lastWorkspaceUsed.get()).toEqual('test-ws-1');
      });

      goToWsNameRoute('test-ws-2')(store.state, store.dispatch);

      await waitForExpect(() => {
        expect(lastWorkspaceUsed.get()).toEqual('test-ws-2');
      });

      updateOpenedWsPaths(() =>
        OpenedWsPaths.createFromArray(['test-ws-2:hello.md']),
      )(store.state, store.dispatch);
      await sleep(0);
    });

    test('opening a note', async () => {
      let setup = () => {
        let { store } = createBasicTestStore({
          slices: [historySlice(), miscEffectsSlice()],
          useMemoryHistorySlice: false,
        });

        return store;
      };
      let store2 = setup();
      await setupMockWorkspaceWithNotes(store2, 'test-ws-1', [
        ['test-ws-1:hello.md', `hello world`],
      ]);
      store2.destroy();

      store2 = setup();
      await setupMockWorkspaceWithNotes(store2, 'test-ws-2', [
        ['test-ws-2:hello.md', `hello world`],
      ]);
      store2.destroy();

      await sleep(0);

      let { store } = createBasicTestStore({
        slices: [historySlice(), miscEffectsSlice()],
        useMemoryHistorySlice: false,
      });

      updateOpenedWsPaths(() =>
        OpenedWsPaths.createFromArray(['test-ws-2:hello.md']),
      )(store.state, store.dispatch);
      await sleep(0);

      expect(lastWorkspaceUsed.get()).toEqual('test-ws-2');

      updateOpenedWsPaths(() =>
        OpenedWsPaths.createFromArray(['test-ws-1:hello.md']),
      )(store.state, store.dispatch);

      await waitForExpect(() =>
        expect(lastWorkspaceUsed.get()).toEqual('test-ws-1'),
      );
    });
  });
});
