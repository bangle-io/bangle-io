/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { WorkspaceType } from '@bangle.io/constants';
import { Extension } from '@bangle.io/extension-registry';
import type { BrowserHistory } from '@bangle.io/history';
import { createWorkspace, deleteWorkspace } from '@bangle.io/slice-workspace';
import { IndexedDbStorageProvider } from '@bangle.io/storage';
import { createBasicTestStore, waitForExpect } from '@bangle.io/test-utils';
import { sleep } from '@bangle.io/utils';
import {
  readAllWorkspacesInfo,
  readWorkspaceInfo,
} from '@bangle.io/workspace-info';

import { historySlice, historySliceKey } from '../history-slice';

const dateNow = Date.now;
let counter = 0;
beforeEach(() => {
  // This avoid flakiness when dealing with deletion
  Date.now = jest.fn(() => counter++);
});

afterEach(() => {
  Date.now = dateNow;
});

let setup = () => {
  class FakeNativeFs extends IndexedDbStorageProvider {
    name = WorkspaceType.NativeFS;
    description = 'test native fs fake';

    async newWorkspaceMetadata(wsName: string, createOpts: any) {
      return createOpts;
    }
  }

  window.history.replaceState(null, '', '/');
  let { store } = createBasicTestStore({
    slices: [historySlice()],
    extensions: [
      Extension.create({
        name: 'test-nativefs-storage-provider-ext',
        application: {
          storageProvider: new FakeNativeFs(),
          onStorageError: () => false,
        },
      }),
    ],
    useMemoryHistorySlice: false,
  });

  let { history } = historySliceKey.getSliceStateAsserted(store.state);

  jest
    .spyOn(history as BrowserHistory, 'updateHistoryState')
    .mockImplementation(() => {});

  return { store, history };
};

describe('saveWorkspaceInfoEffect', () => {
  test('works when not a nativefs workspace', async () => {
    const { store, history } = setup();

    await createWorkspace('testWs', WorkspaceType.Browser, {})(
      store.state,
      store.dispatch,
      store,
    );

    store.dispatch({ name: 'action::some-action' } as any);

    await waitForExpect(() =>
      expect((history as BrowserHistory).updateHistoryState).toBeCalledTimes(1),
    );
    expect((history as BrowserHistory).updateHistoryState).nthCalledWith(1, {});
  });

  test('works when a nativefs workspace', async () => {
    const { store, history } = setup();

    await createWorkspace('testWs', WorkspaceType.NativeFS, {
      rootDirHandle: { root: 'handler' },
    })(store.state, store.dispatch, store);

    store.dispatch({ name: 'action::some-action' } as any);

    await waitForExpect(() =>
      expect((history as BrowserHistory).updateHistoryState).toBeCalledTimes(1),
    );

    expect((history as BrowserHistory).updateHistoryState).nthCalledWith(1, {
      workspaceRootDir: { root: 'handler' },
    });
  });

  test('works when workspace is deleted', async () => {
    const { store, history } = setup();

    await createWorkspace('testWs', WorkspaceType.NativeFS, {
      rootDirHandle: { root: 'handler' },
    })(store.state, store.dispatch, store);

    await waitForExpect(() =>
      expect((history as BrowserHistory).updateHistoryState).toBeCalledTimes(1),
    );

    await deleteWorkspace('testWs')(store.state, store.dispatch, store);

    expect((history as BrowserHistory).updateHistoryState).nthCalledWith(1, {
      workspaceRootDir: { root: 'handler' },
    });

    store.dispatch({ name: 'action::some-action' } as any);

    await sleep(50);

    // does not call again
    expect((history as BrowserHistory).updateHistoryState).toBeCalledTimes(1);
  });

  test('ignores when a workspace is already deleted in the db', async () => {
    let { store, history } = setup();

    const deletedWsName = 'testWs';
    await createWorkspace(deletedWsName, WorkspaceType.NativeFS, {
      rootDirHandle: { root: 'handler' },
    })(store.state, store.dispatch, store);

    await waitForExpect(() =>
      expect((history as BrowserHistory).updateHistoryState).toBeCalledTimes(1),
    );

    await deleteWorkspace(deletedWsName)(store.state, store.dispatch, store);

    await waitForExpect(async () =>
      expect((await readAllWorkspacesInfo()).map((r) => r.name)).not.toContain(
        deletedWsName,
      ),
    );

    await sleep(0);

    // create a new store which can read the db
    ({ store, history } = setup());

    store.dispatch({ name: 'action::some-action' } as any);

    await createWorkspace('testWs2', WorkspaceType.NativeFS, {
      rootDirHandle: { root: 'handler2' },
    })(store.state, store.dispatch, store);

    expect((await readAllWorkspacesInfo()).map((r) => r.name)).toEqual([
      'bangle-help',
      'testWs2',
    ]);

    store.dispatch({ name: 'action::some-action' } as any);

    await waitForExpect(() =>
      expect((history as BrowserHistory).updateHistoryState).toBeCalledTimes(1),
    );

    expect((history as BrowserHistory).updateHistoryState).nthCalledWith(
      1,

      { workspaceRootDir: { root: 'handler2' } },
    );
  });

  test('dispatching multiple times does not call it again', async () => {
    const { store, history } = setup();

    await createWorkspace('testWs', WorkspaceType.NativeFS, {
      rootDirHandle: { root: 'handler' },
    })(store.state, store.dispatch, store);

    const wsInfo = await readWorkspaceInfo('testWs');

    await waitForExpect(() =>
      expect((history as BrowserHistory).updateHistoryState).toBeCalledTimes(1),
    );

    expect((history as BrowserHistory).updateHistoryState).nthCalledWith(
      1,

      { workspaceRootDir: wsInfo?.metadata.rootDirHandle },
    );

    await readAllWorkspacesInfo();

    store.dispatch({ name: 'action::some-action' } as any);

    await waitForExpect(() => {
      expect((history as BrowserHistory).updateHistoryState).toBeCalledTimes(1);
    });
  });
});
