import * as idb from 'idb-keyval';

import {
  WorkspaceTypeBrowser,
  WorkspaceTypeNative,
} from '@bangle.io/constants';
import { ApplicationStore } from '@bangle.io/create-store';
import { Extension } from '@bangle.io/extension-registry';
import {
  getPageLocation,
  pageSliceKey,
  syncPageLocation,
} from '@bangle.io/slice-page';
import { IndexedDbStorageProvider } from '@bangle.io/storage';
import {
  createBasicTestStore,
  createPMNode,
  setupMockWorkspace,
  setupMockWorkspaceWithNotes,
  testMemoryHistorySlice,
} from '@bangle.io/test-utils';
import { BaseError, sleep } from '@bangle.io/utils';
import { wsPathToSearch } from '@bangle.io/ws-path';

import {
  getNote,
  goToWsNameRouteNotFoundRoute,
  WORKSPACE_NOT_FOUND_ERROR,
  WorkspaceError,
} from '..';
import { workspaceSliceKey } from '../common';
import { createNote, refreshWsPaths } from '../file-operations';
import { goToWsNameRoute, updateOpenedWsPaths } from '../operations';
import { createWorkspace } from '../workspaces-operations';
import {
  createStore,
  createWsInfo,
  getActionNamesDispatched,
} from './test-utils';

const getDispatch = (store: ApplicationStore) =>
  workspaceSliceKey.getDispatch(store.dispatch);

describe('refreshWsPathsEffect', () => {
  test('refreshes on create note', async () => {
    const storageProvider = new IndexedDbStorageProvider();

    const { store, dispatchSpy } = createBasicTestStore({
      storageProvider: storageProvider,
    });

    await setupMockWorkspaceWithNotes(store, 'test-ws', [
      ['test-ws:one.md', 'hello one'],
    ]);

    const listAllFilesSpy = jest.spyOn(storageProvider, 'listAllFiles');

    const getRefreshCounter = () =>
      workspaceSliceKey.getSliceStateAsserted(store.state).refreshCounter;

    let refreshCounter = getRefreshCounter();

    await createNote('test-ws:two.md')(store.state, store.dispatch, store);

    expect(getRefreshCounter()).toBe(refreshCounter + 1);

    await sleep(0);

    expect(dispatchSpy).lastCalledWith({
      id: expect.any(String),
      name: 'action::@bangle.io/slice-workspace:update-ws-paths',
      value: {
        wsName: 'test-ws',
        wsPaths: expect.arrayContaining(['test-ws:one.md', 'test-ws:two.md']),
      },
    });

    expect(listAllFilesSpy).toBeCalledTimes(1);
    expect(
      workspaceSliceKey.getSliceStateAsserted(store.state).noteWsPaths,
    ).toContain('test-ws:two.md');

    // any other action does not trigger listAllFiles
    updateOpenedWsPaths((opened) => opened.closeAll())(
      store.state,
      store.dispatch,
    );

    await sleep(0);
    expect(listAllFilesSpy).toBeCalledTimes(1);
  });

  test('refreshes on dispatching refresh counter', async () => {
    const storageProvider = new IndexedDbStorageProvider();

    const { store, dispatchSpy } = createBasicTestStore({
      storageProvider: storageProvider,
    });

    await setupMockWorkspaceWithNotes(store, 'test-ws', [
      ['test-ws:one.md', 'hello one'],
    ]);

    const listAllFilesSpy = jest.spyOn(storageProvider, 'listAllFiles');

    refreshWsPaths()(store.state, store.dispatch);

    await sleep(0);

    expect(listAllFilesSpy).toBeCalledTimes(1);
  });

  test('no workspace no refresh', async () => {
    const storageProvider = new IndexedDbStorageProvider();

    const { store } = createBasicTestStore({
      storageProvider: storageProvider,
    });

    await setupMockWorkspaceWithNotes(store, 'test-ws', [
      ['test-ws:one.md', 'hello one'],
    ]);

    const listAllFilesSpy = jest.spyOn(storageProvider, 'listAllFiles');

    goToWsNameRouteNotFoundRoute('some-ws')(store.state, store.dispatch);

    await sleep(0);

    // refreshing when no wsName
    refreshWsPaths()(store.state, store.dispatch);

    await sleep(0);

    expect(listAllFilesSpy).toBeCalledTimes(0);
  });

  test('refresh when workspace changes', async () => {
    const storageProvider = new IndexedDbStorageProvider();

    const { store } = createBasicTestStore({
      storageProvider: storageProvider,
    });

    await setupMockWorkspaceWithNotes(store, 'test-ws-1', []);
    const listAllFilesSpy = jest.spyOn(storageProvider, 'listAllFiles');

    await setupMockWorkspaceWithNotes(store, 'test-ws-2', []);
    expect(listAllFilesSpy).toBeCalledTimes(1);

    goToWsNameRoute('test-ws-1')(store.state, store.dispatch);
    await sleep(0);
    expect(listAllFilesSpy).toBeCalledTimes(2);
  });
});

describe('refreshWorkspacesEffect', () => {
  test('works', async () => {
    const { store, dispatchSpy } = createStore();

    await sleep(0);
    expect(getActionNamesDispatched(dispatchSpy)).toMatchInlineSnapshot(`
      Array [
        "action::@bangle.io/slice-workspace:set-workspace-infos",
      ]
    `);

    expect(idb.set).toBeCalledTimes(1);
    expect(idb.set).nthCalledWith(1, 'workspaces/2', []);

    const testWsInfo = createWsInfo({
      name: 'testWs',
      type: WorkspaceTypeNative,
      metadata: { rootDirHandle: { root: 'handler' } },
    });

    getDispatch(store)({
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
      value: {
        workspacesInfo: {
          testWs: testWsInfo,
        },
      },
    });

    await sleep(0);
    expect(idb.set).toHaveBeenCalledTimes(2);
    expect(idb.set).nthCalledWith(2, 'workspaces/2', [testWsInfo]);

    // actions which donot result in any update in state donot trigger an idb save
    getDispatch(store)({
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
      value: {
        workspacesInfo: {
          testWs: createWsInfo({
            name: 'testWs',
            type: WorkspaceTypeNative,
            metadata: { rootDirHandle: { root: 'handler' } },
          }),
        },
      },
    });
    // non relevant dispatches donot trigger an update to idb
    getDispatch(store)({
      name: 'action::@bangle.io/some-package',
      value: {},
    } as any);

    expect(idb.set).toHaveBeenCalledTimes(2);

    const modifiedWsInfo = createWsInfo({
      name: 'testWs',
      type: WorkspaceTypeNative,
      lastModified: 100,
      metadata: { rootDirHandle: { root: 'handler' } },
    });
    // actions which have newer lastModified trigger update
    getDispatch(store)({
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
      value: {
        workspacesInfo: {
          testWs: modifiedWsInfo,
        },
      },
    });
    await sleep(0);

    expect(idb.set).toHaveBeenCalledTimes(3);
    expect(idb.set).nthCalledWith(3, 'workspaces/2', [modifiedWsInfo]);
  });

  test('does not overwrite existing values', async () => {
    const { store } = createStore();

    const testWsInfo = createWsInfo({
      name: 'testWs',
      type: WorkspaceTypeNative,
      metadata: { rootDirHandle: { root: 'handler' } },
    });

    const testWsInfoExisting = createWsInfo({
      name: 'testWsExisting',
      type: WorkspaceTypeNative,
      metadata: { rootDirHandle: { root: 'handler' } },
    });

    // some other tab writes data to idb
    await idb.set('workspaces/2', [testWsInfoExisting]);

    getDispatch(store)({
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
      value: {
        workspacesInfo: {
          testWs: testWsInfo,
        },
      },
    });

    await sleep(0);
    expect(idb.set).lastCalledWith('workspaces/2', [
      testWsInfoExisting,
      testWsInfo,
    ]);
  });
});

describe('updateLocationEffect', () => {
  let { store, getActionNames, getAction, dispatchSpy } = createStore(
    undefined,
    undefined,
    undefined,
    [testMemoryHistorySlice()],
  );

  beforeEach(() => {
    ({ store, getActionNames, getAction, dispatchSpy } = createStore(
      undefined,
      undefined,
      undefined,
      [testMemoryHistorySlice()],
    ));
  });

  test('opens a newly created workspace', async () => {
    await createWorkspace('test-ws', WorkspaceTypeBrowser)(
      store.state,
      store.dispatch,
      store,
    );

    await sleep(0);

    expect(getActionNames()).toContain(
      'action::@bangle.io/slice-workspace:set-opened-workspace',
    );

    expect(
      getAction('action::@bangle.io/slice-workspace:set-opened-workspace'),
    ).toEqual([
      {
        id: expect.any(String),
        name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
        value: {
          openedWsPaths: {
            wsPaths: [undefined, undefined],
          },
          wsName: 'test-ws',
        },
      },
    ]);
  });

  test('opening a not found workspace', async () => {
    await goToWsNameRoute('/ws/hello')(store.state, store.dispatch);

    await sleep(0);

    expect(
      await workspaceSliceKey.getSliceStateAsserted(store.state).wsName,
    ).toEqual(undefined);

    expect(await getPageLocation()(store.state)).toEqual({
      pathname: '/ws-not-found/%2Fws%2Fhello',
      search: '',
    });
  });

  test('dispatching same location does not trigger update', async () => {
    const { store, dispatchSpy, getActionNames } = createBasicTestStore({
      sliceKey: workspaceSliceKey,
    });

    await setupMockWorkspaceWithNotes(store, 'test-ws');

    goToWsNameRoute('test-ws')(store.state, store.dispatch);
    await sleep(0);

    const actions = getActionNames();

    await sleep(0);

    goToWsNameRoute('test-ws')(store.state, store.dispatch);
    goToWsNameRoute('test-ws')(store.state, store.dispatch);

    expect(getActionNames()).toEqual([
      ...actions,
      // only slice-page actions are added, which means out effect
      // did not trigger a dispatch
      'action::@bangle.io/slice-page:history-update-pending-navigation',
      'action::@bangle.io/slice-page:history-update-pending-navigation',
    ]);
  });

  test('invalid wsPaths check', async () => {
    const { store } = createBasicTestStore({
      sliceKey: workspaceSliceKey,
    });

    await setupMockWorkspaceWithNotes(store, 'test-ws');

    syncPageLocation({
      pathname: pageSliceKey.getSliceStateAsserted(store.state).location
        .pathname,
      search: wsPathToSearch('test-ws:one.png', ''),
    })(store.state, pageSliceKey.getDispatch(store.dispatch));

    await sleep(0);

    expect(getPageLocation()(store.state)).toEqual({
      pathname: '/ws-invalid-path/test-ws',
      search: '',
    });
  });

  test('handles workspace not found error', async () => {
    const { store } = createBasicTestStore({
      sliceKey: workspaceSliceKey,
    });

    goToWsNameRoute('test-ws')(store.state, store.dispatch);

    expect(workspaceSliceKey.getSliceStateAsserted(store.state).error).toBe(
      undefined,
    );

    await sleep(0);

    expect(getPageLocation()(store.state)).toMatchInlineSnapshot(`
      Object {
        "pathname": "/ws-not-found/test-ws",
        "search": "",
      }
    `);

    expect(workspaceSliceKey.getSliceStateAsserted(store.state).error).toBe(
      undefined,
    );
  });
});

describe('workspaceErrorHandler', () => {
  test('storage provider throwing an error', async () => {
    const storageType = 'testType';
    const wsName = 'my-ws';
    class TestProvider extends IndexedDbStorageProvider {
      name = storageType;
    }

    const provider = new TestProvider();

    const listAllFilesSpy = jest.spyOn(provider, 'listAllFiles');

    await setupMockWorkspace({
      name: wsName,
      type: storageType,
    });

    const onRootError = jest.fn(() => {
      return false;
    });
    const onStorageError = jest.fn((error, store) => {
      return true;
    });

    const { store, actionsDispatched } = createBasicTestStore({
      sliceKey: workspaceSliceKey,
      onError: onRootError,
      extensions: [
        Extension.create({
          name: 'test-storage-extension',
          application: {
            storageProvider: provider,
            onStorageError: onStorageError,
          },
        }),
      ],
    });

    await goToWsNameRoute(wsName)(store.state, store.dispatch);
    await sleep(0);

    expect(workspaceSliceKey.getSliceStateAsserted(store.state).wsName).toBe(
      wsName,
    );

    expect(
      workspaceSliceKey.getSliceStateAsserted(store.state).workspacesInfo,
    ).toMatchObject({
      [wsName]: {
        deleted: false,
        lastModified: 1,
        metadata: {},
        name: wsName,
        type: 'testType',
      },
    });

    await createNote('my-ws:test-note.md', {
      doc: createPMNode([], `hello`),
      open: true,
    })(store.state, store.dispatch, store);
    expect(
      (
        await getNote('my-ws:test-note.md')(store.state, store.dispatch)
      )?.toString(),
    ).toContain('hello');

    // real testing starts here
    expect(listAllFilesSpy).toBeCalledTimes(1);
    expect(onStorageError).toBeCalledTimes(0);

    await sleep(0);
    let actionsBefore = actionsDispatched.slice(0);

    const error = new BaseError('oops everything went wrong');
    listAllFilesSpy.mockImplementation(async () => {
      throw error;
    });

    refreshWsPaths()(store.state, store.dispatch);

    await sleep(0);

    expect(onRootError).toBeCalledTimes(1);
    expect(onStorageError).toBeCalledTimes(1);
    expect(onStorageError).nthCalledWith(1, error, store);

    expect(actionsDispatched.slice(actionsBefore.length)).toMatchInlineSnapshot(
      [
        { id: expect.any(String) },
        { id: expect.any(String) },
        { id: expect.any(String) },
      ],
      `
      Array [
        Object {
          "id": Any<String>,
          "name": "action::@bangle.io/slice-workspace:refresh-ws-paths",
        },
        Object {
          "id": Any<String>,
          "name": "action::@bangle.io/slice-workspace:set-error",
          "value": Object {
            "error": [BaseError: oops everything went wrong],
          },
        },
        Object {
          "id": Any<String>,
          "name": "action::@bangle.io/slice-workspace:set-error",
          "value": Object {
            "error": undefined,
          },
        },
      ]
    `,
    );
  });

  test('handles error', async () => {
    const storageType = 'testType';
    class TestProvider extends IndexedDbStorageProvider {
      name = storageType;
    }

    const provider = new TestProvider();
    const onStorageError = jest.fn((error, store) => {
      return true;
    });
    const { store } = createBasicTestStore({
      sliceKey: workspaceSliceKey,
      extensions: [
        Extension.create({
          name: 'test-storage-extension',
          application: {
            storageProvider: provider,
            onStorageError: onStorageError,
          },
        }),
      ],
    });

    await createWorkspace('test-ws', WorkspaceTypeBrowser)(
      store.state,
      store.dispatch,
      store,
    );

    await sleep(0);

    const consoleLog = console.log;
    console.log = jest.fn();

    store.errorHandler(
      new WorkspaceError('not found', WORKSPACE_NOT_FOUND_ERROR),
    );

    await sleep(0);

    expect(getPageLocation()(store.state)).toMatchInlineSnapshot(`
      Object {
        "pathname": "/ws-not-found/test-ws",
        "search": "",
      }
    `);

    expect(onStorageError).toBeCalledTimes(0);
    console.log = consoleLog;
  });
});
