// eslint-disable-next-line simple-import-sort/imports
import {
  idbMock,
  resetIndexeddb,
} from '@bangle.io/test-utils/baby-fs-test-mock2';

import { BrowserHistory } from '@bangle.io/history';
import { pageSlice, PageSliceAction } from '@bangle.io/slice-page';
import {
  WorkspaceInfo,
  workspacesSlice,
  listWorkspaces,
  WorkspaceType,
  workspacesSliceKey,
  deleteWorkspace,
} from '@bangle.io/slice-workspaces-manager';

import { createTestStore } from '@bangle.io/test-utils/create-test-store';
import { sleep } from '@bangle.io/utils';

import { historySlice, historySliceKey } from '../history-slice';
import { ApplicationStore } from '@bangle.io/create-store';

const createWsInfo = (obj: Partial<WorkspaceInfo>): WorkspaceInfo => {
  return {
    name: 'test-ws-info',
    type: WorkspaceType['browser'],
    lastModified: 0,
    metadata: {},
    ...obj,
  };
};

beforeEach(resetIndexeddb);

let setup = () => {
  window.history.replaceState(null, '', '/');
  let { store } = createTestStore<PageSliceAction>([
    pageSlice(),
    historySlice(),
    workspacesSlice(),
  ]);

  let { history } = historySliceKey.getSliceStateAsserted(store.state);

  jest
    .spyOn(history as BrowserHistory, 'updateHistoryState')
    .mockImplementation(() => {});

  return { store, history };
};
beforeEach(() => {});

describe('saveWorkspaceInfoEffect', () => {
  test('works when not a nativefs workspace', async () => {
    idbMock.setupMockWorkspace({ name: 'testWs' });

    const { store, history } = setup();
    store.dispatch({ name: 'action::some-action' } as any);

    await sleep(0);

    expect((history as BrowserHistory).updateHistoryState).toBeCalledTimes(1);
    expect((history as BrowserHistory).updateHistoryState).nthCalledWith(
      1,

      { workspacesRootDir: [] },
    );
  });

  test('works when a nativefs workspace', async () => {
    idbMock.setupMockWorkspace({
      name: 'testWs',
      type: WorkspaceType.nativefs,
      metadata: { rootDirHandle: { root: 'handler' } },
    });

    const { store, history } = setup();

    store.dispatch({ name: 'action::some-action' } as any);

    await sleep(0);

    expect((history as BrowserHistory).updateHistoryState).toBeCalledTimes(1);
    expect((history as BrowserHistory).updateHistoryState).nthCalledWith(1, {
      workspacesRootDir: [{ root: 'handler' }],
    });
  });

  test('ignores when a workspace is deleted', async () => {
    idbMock.setupMockWorkspace(
      createWsInfo({
        name: 'testWs',
        type: WorkspaceType.nativefs,
        deleted: true,
        metadata: { rootDirHandle: { root: 'handler' } },
      }),
    );
    const { store, history } = setup();

    store.dispatch({ name: 'action::some-action' } as any);

    await sleep(0);

    expect((history as BrowserHistory).updateHistoryState).toBeCalledTimes(1);
    expect((history as BrowserHistory).updateHistoryState).nthCalledWith(
      1,

      { workspacesRootDir: [] },
    );
  });

  test('when a workspace is deleted', async () => {
    idbMock.setupMockWorkspace(
      createWsInfo({
        name: 'testWs',
        type: WorkspaceType.nativefs,
        metadata: { rootDirHandle: { root: 'handler' } },
      }),
    );
    const { store, history } = setup();

    await sleep(0);
    store.dispatch({ name: 'action::some-action' } as any);

    await sleep(0);

    expect((history as BrowserHistory).updateHistoryState).lastCalledWith({
      workspacesRootDir: [{ root: 'handler' }],
    });

    let morphedStore = store as ApplicationStore;

    deleteWorkspace('testWs')(
      morphedStore.state,
      morphedStore.dispatch,
      morphedStore,
    );
    await sleep(0);

    expect((history as BrowserHistory).updateHistoryState).lastCalledWith({
      workspacesRootDir: [],
    });
  });

  test('dispatching multipe times does not call it again', async () => {
    const wsInfo = createWsInfo({
      name: 'testWs',
      type: WorkspaceType.nativefs,
      metadata: { rootDirHandle: { root: 'handler' } },
    });

    const wsInfos = {
      testWs: wsInfo,
    };

    idbMock.setupMockWorkspace(wsInfo);

    const { store, history } = setup();

    store.dispatch({ name: 'action::some-action' } as any);

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
