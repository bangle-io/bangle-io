/**
 * @jest-environment jsdom
 */
import {
  WorkspaceTypeBrowser,
  WorkspaceTypeNative,
} from '@bangle.io/constants';
import type { ApplicationStore } from '@bangle.io/create-store';
import { Extension } from '@bangle.io/extension-registry';
import type { BrowserHistory } from '@bangle.io/history';
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspaceInfoAsync,
  listWorkspaces,
} from '@bangle.io/slice-workspace';
import { IndexedDbStorageProvider } from '@bangle.io/storage';
import { createBasicTestStore } from '@bangle.io/test-utils';
import { sleep } from '@bangle.io/utils';

import { historySlice, historySliceKey } from '../history-slice';

const dateNow = Date.now;
let counter = 0;
let abortController = new AbortController();
let signal = abortController.signal;
beforeEach(() => {
  // This avoid flakiness when dealing with deletion
  Date.now = jest.fn(() => counter++);
  abortController = new AbortController();
  signal = abortController.signal;
});

afterEach(() => {
  Date.now = dateNow;
  abortController.abort();
});

let setup = () => {
  class FakeNativeFs extends IndexedDbStorageProvider {
    name = WorkspaceTypeNative;
    description = 'test native fs fake';

    async newWorkspaceMetadata(wsName: string, createOpts: any) {
      return createOpts;
    }
  }

  window.history.replaceState(null, '', '/');
  let { store } = createBasicTestStore({
    signal,
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

    await createWorkspace('testWs', WorkspaceTypeBrowser, {})(
      store.state,
      store.dispatch,
      store,
    );

    store.dispatch({ name: 'action::some-action' } as any);

    await sleep(0);

    expect((history as BrowserHistory).updateHistoryState).toBeCalledTimes(1);
    expect((history as BrowserHistory).updateHistoryState).nthCalledWith(1, {
      workspacesRootDir: [],
    });
  });

  test('works when a nativefs workspace', async () => {
    const { store, history } = setup();

    await createWorkspace('testWs', WorkspaceTypeNative, {
      rootDirHandle: { root: 'handler' },
    })(store.state, store.dispatch, store);

    store.dispatch({ name: 'action::some-action' } as any);

    await sleep(0);

    expect((history as BrowserHistory).updateHistoryState).toBeCalledTimes(1);
    expect((history as BrowserHistory).updateHistoryState).nthCalledWith(1, {
      workspacesRootDir: [{ root: 'handler' }],
    });
  });

  test('ignores when a workspace is deleted', async () => {
    const { store, history } = setup();

    await createWorkspace('testWs', WorkspaceTypeNative, {
      rootDirHandle: { root: 'handler' },
    })(store.state, store.dispatch, store);

    await deleteWorkspace('testWs')(store.state, store.dispatch, store);

    store.dispatch({ name: 'action::some-action' } as any);

    await sleep(0);

    // expect((history as BrowserHistory).updateHistoryState).(1);
    expect((history as BrowserHistory).updateHistoryState).lastCalledWith({
      workspacesRootDir: [],
    });
  });

  test('ignores when a workspace is already deleted in the db', async () => {
    let { store, history } = setup();

    const deletedWsName = 'testWs';
    await createWorkspace(deletedWsName, WorkspaceTypeNative, {
      rootDirHandle: { root: 'handler' },
    })(store.state, store.dispatch, store);

    await deleteWorkspace(deletedWsName)(store.state, store.dispatch, store);

    await sleep(0);

    expect(
      (await listWorkspaces()(store.state, store.dispatch, store)).map(
        (r) => r.name,
      ),
    ).not.toContain(deletedWsName);

    await sleep(0);

    // create a new store which can read the db
    ({ store, history } = setup());

    store.dispatch({ name: 'action::some-action' } as any);

    await sleep(0);

    await createWorkspace('testWs2', WorkspaceTypeNative, {
      rootDirHandle: { root: 'handler' },
    })(store.state, store.dispatch, store);

    expect(
      (await listWorkspaces()(store.state, store.dispatch, store)).map(
        (r) => r.name,
      ),
    ).toEqual(['bangle-help', 'testWs2']);

    store.dispatch({ name: 'action::some-action' } as any);

    await sleep(0);

    expect((history as BrowserHistory).updateHistoryState).toBeCalledTimes(2);
    expect((history as BrowserHistory).updateHistoryState).nthCalledWith(
      2,

      { workspacesRootDir: [{ root: 'handler' }] },
    );
  });

  test('dispatching multipe times does not call it again', async () => {
    const { store, history } = setup();

    await createWorkspace('testWs', WorkspaceTypeNative, {
      rootDirHandle: { root: 'handler' },
    })(store.state, store.dispatch, store);

    const wsInfo = await getWorkspaceInfoAsync('testWs')(store.state);

    await sleep(0);

    expect((history as BrowserHistory).updateHistoryState).toBeCalledTimes(1);
    expect((history as BrowserHistory).updateHistoryState).nthCalledWith(
      1,

      { workspacesRootDir: [wsInfo.metadata.rootDirHandle] },
    );

    let morphedStore = store as ApplicationStore;

    await listWorkspaces()(
      morphedStore.state,
      morphedStore.dispatch,
      morphedStore,
    );

    store.dispatch({ name: 'action::some-action' } as any);
    await sleep(0);

    expect((history as BrowserHistory).updateHistoryState).toBeCalledTimes(1);
  });
});
