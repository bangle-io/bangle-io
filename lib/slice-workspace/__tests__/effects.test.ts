import {
  MAX_OPEN_EDITORS,
  WorkspaceTypeBrowser,
  WorkspaceTypeNative,
} from '@bangle.io/constants';
import type { ApplicationStore } from '@bangle.io/create-store';
import { getWorkspaceInfoTable } from '@bangle.io/db-app';
import { Extension } from '@bangle.io/extension-registry';
import {
  getPageLocation,
  pageSliceKey,
  syncPageLocation,
  wsPathToSearch,
} from '@bangle.io/slice-page';
import { IndexedDbStorageProvider } from '@bangle.io/storage';
import {
  createBasicTestStore,
  createPMNode,
  setupMockWorkspaceWithNotes,
  testMemoryHistorySlice,
  waitForExpect,
} from '@bangle.io/test-utils';
import { BaseError, createEmptyArray, sleep } from '@bangle.io/utils';

import {
  getNote,
  goToWsNameRouteNotFoundRoute,
  WORKSPACE_NOT_FOUND_ERROR,
  WorkspaceError,
} from '..';
import { workspaceSliceKey } from '../common';
import { createNote, refreshWsPaths } from '../file-operations';
import { goToWsNameRoute, updateOpenedWsPaths } from '../operations';
import { WORKSPACE_KEY } from '../read-ws-info';
import { createWorkspace } from '../workspaces-operations';
import {
  createStore,
  createWsInfo,
  getActionNamesDispatched,
} from './test-utils';

const getDispatch = (store: ApplicationStore) =>
  workspaceSliceKey.getDispatch(store.dispatch);

// let idbSetSpy: jest.SpyInstance;

let abortController = new AbortController();
let signal = abortController.signal;

beforeEach(() => {
  abortController = new AbortController();
  signal = abortController.signal;
});

afterEach(() => {
  abortController.abort();
});

describe('refreshWsPathsEffect', () => {
  test('refreshes on create note', async () => {
    const storageProvider = new IndexedDbStorageProvider();

    const { store, dispatchSpy, getAction } = createBasicTestStore({
      signal,
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

    await waitForExpect(() =>
      expect(
        getAction('action::@bangle.io/slice-workspace:update-ws-paths'),
      ).toContainEqual({
        id: expect.any(String),
        name: 'action::@bangle.io/slice-workspace:update-ws-paths',
        value: {
          wsName: 'test-ws',
          wsPaths: expect.arrayContaining(['test-ws:one.md', 'test-ws:two.md']),
        },
      }),
    );

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

    const { store } = createBasicTestStore({
      signal,
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
      signal,
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

  // eslint-disable-next-line jest/no-disabled-tests
  test.skip('refresh when workspace changes', async () => {
    const storageProvider = new IndexedDbStorageProvider();

    const { store } = createBasicTestStore({
      signal,
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
    const { store, dispatchSpy } = createStore({
      signal: abortController.signal,
    });

    await waitForExpect(() =>
      expect(getActionNamesDispatched(dispatchSpy)).toEqual([
        'action::@bangle.io/slice-workspace:set-workspace-infos',
      ]),
    );

    await waitForExpect(async () =>
      expect(await getWorkspaceInfoTable().getAll()).toEqual([[]]),
    );

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

    await waitForExpect(async () =>
      expect((await getWorkspaceInfoTable().get(WORKSPACE_KEY))?.length).toBe(
        1,
      ),
    );

    expect(await getWorkspaceInfoTable().get(WORKSPACE_KEY)).toEqual([
      {
        lastModified: 0,
        metadata: {
          rootDirHandle: {
            root: 'handler',
          },
        },
        name: 'testWs',
        type: 'nativefs',
      },
    ]);

    let wsInfo2 = createWsInfo({
      name: 'testWs',
      type: WorkspaceTypeNative,
      metadata: { rootDirHandle: { root: 'handler' } },
    });
    getDispatch(store)({
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
      value: {
        workspacesInfo: {
          testWs: wsInfo2,
        },
      },
    });
    getDispatch(store)({
      name: 'action::@bangle.io/some-package',
      value: {},
    } as any);

    expect(await getWorkspaceInfoTable().getAll()).toEqual([[wsInfo2]]);

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

    await waitForExpect(async () => {
      expect(await getWorkspaceInfoTable().getAll()).toEqual([
        [modifiedWsInfo],
      ]);
    });
  });

  test('does not overwrite existing values', async () => {
    const { store } = createStore({
      signal: abortController.signal,
    });

    const testWsInfo = createWsInfo({
      name: 'testWs',
      type: WorkspaceTypeNative,
      metadata: { rootDirHandle: { root: 'handler' } },
      deleted: false,
    });

    const testWsInfoExisting = createWsInfo({
      name: 'testWsExisting',
      type: WorkspaceTypeNative,
      metadata: { rootDirHandle: { root: 'handler' } },
      deleted: false,
    });

    // some other tab writes data to idb
    // await idb.set('workspaces/2', [testWsInfoExisting]);

    await getWorkspaceInfoTable().put(WORKSPACE_KEY, [testWsInfoExisting]);

    getDispatch(store)({
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
      value: {
        workspacesInfo: {
          testWs: testWsInfo,
        },
      },
    });

    await waitForExpect(async () => {
      expect(
        (await getWorkspaceInfoTable().getAll()).flatMap((a) => a).sort(),
      ).toEqual([testWsInfoExisting, testWsInfo]);
    });
  });
});

describe('updateLocationEffect', () => {
  let { store, getActionNames, getAction } = createStore({
    signal: abortController.signal,
    additionalSlices: [testMemoryHistorySlice()],
  });

  beforeEach(() => {
    ({ store, getActionNames, getAction } = createStore({
      signal: abortController.signal,
      additionalSlices: [testMemoryHistorySlice()],
    }));
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
            _wsPaths: createEmptyArray(MAX_OPEN_EDITORS),
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

    await waitForExpect(async () => {
      expect(await getPageLocation()(store.state)).toEqual({
        pathname: '/ws-not-found/%2Fws%2Fhello',
        search: '',
      });
    });
  });

  test('dispatching same location does not trigger update', async () => {
    const { store, getActionNames } = createBasicTestStore({
      signal,
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
      signal,
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
      signal,
      sliceKey: workspaceSliceKey,
    });

    goToWsNameRoute('test-ws')(store.state, store.dispatch);

    expect(workspaceSliceKey.getSliceStateAsserted(store.state).error).toBe(
      undefined,
    );

    await waitForExpect(() => {
      expect(getPageLocation()(store.state)).toEqual({
        pathname: '/ws-not-found/test-ws',
        search: '',
      });
    });

    expect(workspaceSliceKey.getSliceStateAsserted(store.state).error).toBe(
      undefined,
    );
  });

  test('retains mini-editor in case of location change but wsName stays', async () => {
    const { store } = createBasicTestStore({
      signal,
      sliceKey: workspaceSliceKey,
    });

    await setupMockWorkspaceWithNotes(store, 'test-ws');

    updateOpenedWsPaths((newOpened) =>
      newOpened.updateMiniEditorWsPath('test-ws:two.md'),
    )(store.state, store.dispatch);

    expect(
      workspaceSliceKey.getSliceStateAsserted(store.state).openedWsPaths
        .miniEditorWsPath,
    ).toBe('test-ws:two.md');

    syncPageLocation({
      pathname: pageSliceKey.getSliceStateAsserted(store.state).location
        .pathname,
      search: wsPathToSearch('test-ws:three.md', ''),
    })(store.state, pageSliceKey.getDispatch(store.dispatch));

    await sleep(0);

    const newOpenedWsPaths = workspaceSliceKey.getSliceStateAsserted(
      store.state,
    ).openedWsPaths;

    expect(newOpenedWsPaths.miniEditorWsPath).toBe('test-ws:two.md');
    expect(newOpenedWsPaths.primaryWsPath).toEqual('test-ws:two.md');
    expect(newOpenedWsPaths.secondaryWsPath).toEqual('test-ws:three.md');
  });

  test('resets mini-editor in case of location update with wsName change', async () => {
    const { store } = createBasicTestStore({
      signal,
      sliceKey: workspaceSliceKey,
    });

    await setupMockWorkspaceWithNotes(store, 'test-ws2');
    await setupMockWorkspaceWithNotes(store, 'test-ws');

    updateOpenedWsPaths((newOpened) =>
      newOpened.updateMiniEditorWsPath('test-ws:two.md'),
    )(store.state, store.dispatch);

    expect(
      workspaceSliceKey.getSliceStateAsserted(store.state).openedWsPaths
        .miniEditorWsPath,
    ).toBe('test-ws:two.md');

    syncPageLocation({
      pathname: '/ws/test-ws2',
    })(store.state, pageSliceKey.getDispatch(store.dispatch));

    await sleep(0);

    const newOpenedWsPaths = workspaceSliceKey.getSliceStateAsserted(
      store.state,
    ).openedWsPaths;

    expect(newOpenedWsPaths.miniEditorWsPath).toBeUndefined();
  });
});

describe('workspaceErrorHandler', () => {
  // eslint-disable-next-line jest/no-disabled-tests
  test.skip('storage provider throwing an error', async () => {
    const storageType = 'testType';
    const wsName = 'my-ws';
    class TestProvider extends IndexedDbStorageProvider {
      name = storageType;
    }

    const provider = new TestProvider();

    const listAllFilesSpy = jest.spyOn(provider, 'listAllFiles');

    // await setupMockWorkspace({
    //   name: wsName,
    //   type: storageType,
    // });

    const onRootError = jest.fn(() => {
      return false;
    });
    const onStorageError = jest.fn((error, store) => {
      return true;
    });

    const { store, actionsDispatched } = createBasicTestStore({
      signal,
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
        await getNote('my-ws:test-note.md')(store.state, store.dispatch, store)
      )?.toString(),
    ).toContain('hello');

    // real testing starts here
    expect(listAllFilesSpy).toBeCalledTimes(1);
    expect(onStorageError).toBeCalledTimes(0);

    await sleep(0);
    let actionsBefore = actionsDispatched.slice(0);

    const error = new BaseError({ message: 'oops everything went wrong' });
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
      signal,
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
      new WorkspaceError({
        message: 'not found',
        code: WORKSPACE_NOT_FOUND_ERROR,
      }),
    );

    await sleep(0);

    await waitForExpect(() => {
      expect(getPageLocation()(store.state)).toEqual({
        pathname: '/ws-not-found/test-ws',
        search: '',
      });
    });

    expect(onStorageError).toBeCalledTimes(0);
    console.log = consoleLog;
  });
});
