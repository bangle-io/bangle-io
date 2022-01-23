/**
 * @jest-environment jsdom
 */
import { WorkspaceType } from '@bangle.io/constants';
import { ApplicationStore } from '@bangle.io/create-store';
import { BrowserHistory } from '@bangle.io/history';
import { pageSlice } from '@bangle.io/slice-page';
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspaceInfo,
  listWorkspaces,
  workspaceSlice,
} from '@bangle.io/slice-workspace';
import { createTestStore } from '@bangle.io/test-utils/create-test-store';
import { sleep } from '@bangle.io/utils';

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
  window.history.replaceState(null, '', '/');
  let { store } = createTestStore([
    pageSlice(),
    historySlice(),
    workspaceSlice(),
  ]);

  let { history } = historySliceKey.getSliceStateAsserted(store.state);

  jest
    .spyOn(history as BrowserHistory, 'updateHistoryState')
    .mockImplementation(() => {});

  return { store, history };
};

describe('saveWorkspaceInfoEffect', () => {
  test('works when not a nativefs workspace', async () => {
    const { store, history } = setup();

    await createWorkspace('testWs', WorkspaceType.browser, {})(
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

    await createWorkspace('testWs', WorkspaceType.nativefs, {
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

    await createWorkspace('testWs', WorkspaceType.nativefs, {
      rootDirHandle: { root: 'handler' },
    })(store.state, store.dispatch, store);

    await deleteWorkspace('testWs')(store.state, store.dispatch, store);

    store.dispatch({ name: 'action::some-action' } as any);

    await sleep(0);

    expect((history as BrowserHistory).updateHistoryState).toBeCalledTimes(1);
    expect((history as BrowserHistory).updateHistoryState).nthCalledWith(
      1,

      { workspacesRootDir: [] },
    );
  });

  test('ignores when a workspace is already deleted in the db', async () => {
    let { store, history } = setup();

    const deletedWsName = 'testWs';
    await createWorkspace(deletedWsName, WorkspaceType.nativefs, {
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

    await createWorkspace('testWs2', WorkspaceType.nativefs, {
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

    await createWorkspace('testWs', WorkspaceType.nativefs, {
      rootDirHandle: { root: 'handler' },
    })(store.state, store.dispatch, store);

    const wsInfo = await getWorkspaceInfo('testWs')(store.state);

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
