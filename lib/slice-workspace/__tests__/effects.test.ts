import { MAX_OPEN_EDITORS, WorkspaceTypeBrowser } from '@bangle.io/constants';
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
import {
  getOpenedWsPaths,
  goToWsNameRoute,
  updateOpenedWsPaths,
} from '../operations';
import { readWorkspaceInfo, saveWorkspaceInfo } from '../read-ws-info';
import { createWorkspace } from '../workspaces-operations';
import { createStore } from './test-utils';

jest.mock('../config', () => {
  const config = jest.requireActual('../config');

  return {
    ...config,
    WORKSPACE_INFO_CACHE_REFRESH_INTERVAL: 20,
  };
});

describe('refreshWsPathsEffect', () => {
  test('refreshes on create note', async () => {
    const storageProvider = new IndexedDbStorageProvider();

    const { store, getAction } = createBasicTestStore({
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
      storageProvider: storageProvider,
    });

    await setupMockWorkspaceWithNotes(store, 'test-ws', [
      ['test-ws:one.md', 'hello one'],
    ]);

    const listAllFilesSpy = jest.spyOn(storageProvider, 'listAllFiles');

    refreshWsPaths()(store.state, store.dispatch);

    await waitForExpect(() => expect(listAllFilesSpy).toBeCalledTimes(1));
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

  // eslint-disable-next-line jest/no-disabled-tests
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
    await waitForExpect(() => expect(listAllFilesSpy).toBeCalledTimes(2));
  });
});

describe('updateLocationEffect', () => {
  let { store, getActionNames, getAction } = createStore({
    additionalSlices: [testMemoryHistorySlice()],
  });

  beforeEach(() => {
    ({ store, getActionNames, getAction } = createStore({
      additionalSlices: [testMemoryHistorySlice()],
    }));
  });

  test('opens a newly created workspace', async () => {
    await createWorkspace('test-ws', WorkspaceTypeBrowser)(
      store.state,
      store.dispatch,
      store,
    );

    await waitForExpect(() => {
      expect(getPageLocation()(store.state)?.pathname).toBe('/ws/test-ws');
    });

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
      sliceKey: workspaceSliceKey,
    });

    await setupMockWorkspaceWithNotes(store, 'test-ws');

    goToWsNameRoute('test-ws')(store.state, store.dispatch);

    // wait for it to reach `/ws/test-ws` i.e. to opened wsPaths
    await waitForExpect(() => {
      expect(getOpenedWsPaths()(store.state).hasSomeOpenedWsPaths()).toBe(
        false,
      );
    });

    const actions = [...getActionNames()];

    goToWsNameRoute('test-ws')(store.state, store.dispatch);
    goToWsNameRoute('test-ws')(store.state, store.dispatch);

    await sleep(20);

    expect(getActionNames()).toEqual([
      ...actions,
      // should not have 'action::@bangle.io/slice-workspace:set-opened-workspace',
      // only slice-page actions are added, which means our effects
      // did not trigger the dispatch the above mentioned action
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

    await waitForExpect(() =>
      expect(getPageLocation()(store.state)).toEqual({
        pathname: '/ws-invalid-path/test-ws',
        search: '',
      }),
    );
  });

  test('handles workspace not found error', async () => {
    const { store } = createBasicTestStore({
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

    await waitForExpect(() => {
      const newOpenedWsPaths = workspaceSliceKey.getSliceStateAsserted(
        store.state,
      ).openedWsPaths;

      expect(newOpenedWsPaths.miniEditorWsPath).toBe('test-ws:two.md');
      expect(newOpenedWsPaths.primaryWsPath).toEqual('test-ws:two.md');
      expect(newOpenedWsPaths.secondaryWsPath).toEqual('test-ws:three.md');
    });
  });

  test('resets mini-editor in case of location update with wsName change', async () => {
    const { store } = createBasicTestStore({
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

    await waitForExpect(() => {
      const newOpenedWsPaths = workspaceSliceKey.getSliceStateAsserted(
        store.state,
      ).openedWsPaths;
      expect(newOpenedWsPaths.miniEditorWsPath).toBeUndefined();
    });
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

    await createWorkspace(wsName, provider.name)(
      store.state,
      store.dispatch,
      store,
    );

    await goToWsNameRoute(wsName)(store.state, store.dispatch);

    await waitForExpect(() => {
      expect(workspaceSliceKey.getSliceStateAsserted(store.state).wsName).toBe(
        wsName,
      );
    });

    await waitForExpect(() => {
      expect(
        workspaceSliceKey.getSliceStateAsserted(store.state)
          .cachedWorkspaceInfo,
      ).toEqual({
        deleted: false,
        lastModified: expect.any(Number),
        metadata: {},
        name: wsName,
        type: 'testType',
      });
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
    expect(listAllFilesSpy).toBeCalledTimes(2);
    expect(onStorageError).toBeCalledTimes(0);

    await sleep(0);
    let actionsBefore = actionsDispatched.slice(0);

    const error = new BaseError({ message: 'oops everything went wrong' });
    listAllFilesSpy.mockImplementation(async () => {
      throw error;
    });

    refreshWsPaths()(store.state, store.dispatch);

    await waitForExpect(() => {
      expect(onRootError).toBeCalledTimes(1);
    });
    expect(onStorageError).toBeCalledTimes(1);
    expect(onStorageError).nthCalledWith(1, error, store);

    expect(actionsDispatched.slice(actionsBefore.length)).toMatchInlineSnapshot(
      [
        { id: expect.any(String) },
        { id: expect.any(String) },
        { id: expect.any(String) },
      ],
      `
      [
        {
          "id": Any<String>,
          "name": "action::@bangle.io/slice-workspace:refresh-ws-paths",
        },
        {
          "id": Any<String>,
          "name": "action::@bangle.io/slice-workspace:set-error",
          "value": {
            "error": [BaseError: oops everything went wrong],
          },
        },
        {
          "id": Any<String>,
          "name": "action::@bangle.io/slice-workspace:set-error",
          "value": {
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

    await waitForExpect(() => {
      expect(getPageLocation()(store.state)?.pathname).toBe('/ws/test-ws');
    });

    const consoleLog = console.log;
    console.log = jest.fn();

    store.errorHandler(
      new WorkspaceError({
        message: 'not found',
        code: WORKSPACE_NOT_FOUND_ERROR,
      }),
    );

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

describe('cachedWorkspaceInfoEffect', () => {
  test('gets correct wsInfo when workspace changes', async () => {
    const { store } = createBasicTestStore({});

    await setupMockWorkspaceWithNotes(store, 'test-ws-1', [
      ['test-ws-1:one.md', 'hello one'],
    ]);

    await setupMockWorkspaceWithNotes(store, 'test-ws-2', [
      ['test-ws-2:one.md', 'hello one'],
    ]);

    await waitForExpect(() => {
      expect(
        workspaceSliceKey.getSliceStateAsserted(store.state)
          .cachedWorkspaceInfo,
      ).toMatchObject({
        deleted: false,
        lastModified: expect.any(Number),
        metadata: {},
        name: 'test-ws-2',
        type: 'browser',
      });
    });

    goToWsNameRoute('test-ws-1')(store.state, store.dispatch);

    await waitForExpect(() => {
      expect(
        workspaceSliceKey.getSliceStateAsserted(store.state)
          .cachedWorkspaceInfo,
      ).toMatchObject({
        deleted: false,
        lastModified: expect.any(Number),
        metadata: {},
        name: 'test-ws-1',
        type: 'browser',
      });
    });
  });

  test('clears when no active workspace', async () => {
    const { store } = createBasicTestStore({});

    await setupMockWorkspaceWithNotes(store, 'test-ws-1', [
      ['test-ws-1:one.md', 'hello one'],
    ]);

    await waitForExpect(() => {
      expect(
        workspaceSliceKey.getSliceStateAsserted(store.state)
          .cachedWorkspaceInfo,
      ).toBeDefined();
    });

    goToWsNameRouteNotFoundRoute('test-ws-1')(store.state, store.dispatch);

    await waitForExpect(() => {
      expect(
        workspaceSliceKey.getSliceStateAsserted(store.state)
          .cachedWorkspaceInfo,
      ).toBeUndefined();
    });
  });

  test('periodically refreshes', async () => {
    const { store } = createBasicTestStore({});

    await setupMockWorkspaceWithNotes(store, 'test-ws-1', [
      ['test-ws-1:one.md', 'hello one'],
    ]);

    await waitForExpect(() => {
      expect(
        workspaceSliceKey.getSliceStateAsserted(store.state)
          .cachedWorkspaceInfo,
      ).toBeDefined();
    });

    const wsInfo = await readWorkspaceInfo('test-ws-1');
    expect(wsInfo).toEqual({
      deleted: false,
      lastModified: expect.any(Number),
      metadata: {},
      name: 'test-ws-1',
      type: 'browser',
    });

    await saveWorkspaceInfo(
      'test-ws-1',
      (wsInfo) => ({
        ...wsInfo!,
        metadata: {
          test: '1234',
        },
      }),
      wsInfo!,
    );

    expect(await readWorkspaceInfo('test-ws-1')).toEqual({
      deleted: false,
      lastModified: expect.any(Number),
      metadata: {
        test: '1234',
      },
      name: 'test-ws-1',
      type: 'browser',
    });

    await waitForExpect(() => {
      expect(
        workspaceSliceKey.getSliceStateAsserted(store.state)
          .cachedWorkspaceInfo,
      ).toEqual({
        deleted: false,
        lastModified: expect.any(Number),
        metadata: {
          test: '1234',
        },
        name: 'test-ws-1',
        type: 'browser',
      });
    });
  });
});
