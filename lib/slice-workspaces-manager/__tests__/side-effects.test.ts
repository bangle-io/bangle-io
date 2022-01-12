// Need to disable sort to make the mocking run first.
// eslint-disable-next-line simple-import-sort/imports
import mockBabyFs from '@bangle.io/test-utils/baby-fs-test-mock';
import * as idb from 'idb-keyval';

import { saveToHistoryState } from '@bangle.io/slice-page';
import { sleep } from '@bangle.io/utils';
import {
  createStore,
  createWsInfo,
  getActionNamesDispatched,
} from './test-utils';
import { WorkspaceType } from '..';

jest.mock('@bangle.io/slice-page', () => {
  const ops = jest.requireActual('@bangle.io/slice-page');
  return {
    ...ops,
    saveToHistoryState: jest.fn(() => () => {}),
  };
});

const saveToHistoryStateMock = saveToHistoryState as jest.MockedFunction<
  typeof saveToHistoryState
>;

beforeEach(() => {
  mockBabyFs.mockStore.clear();
  saveToHistoryStateMock.mockImplementation(() => () => {});
});

describe('saveWorkspaceInfoEffect', () => {
  test('works when not a nativefs workspace', async () => {
    const { store, dispatchSpy } = createStore();

    store.dispatch({
      name: 'action::@bangle.io/slice-workspaces-manager:set-workspace-infos',
      value: {
        workspaceInfos: {
          testWs: createWsInfo({ name: 'testWs' }),
        },
      },
    });

    await sleep(0);

    expect(saveToHistoryState).toBeCalledTimes(1);
    expect(saveToHistoryState).nthCalledWith(1, 'workspacesRootDir', []);
  });
  test('works when a nativefs workspace', async () => {
    const { store, dispatchSpy } = createStore();

    store.dispatch({
      name: 'action::@bangle.io/slice-workspaces-manager:set-workspace-infos',
      value: {
        workspaceInfos: {
          testWs: createWsInfo({
            name: 'testWs',
            type: WorkspaceType.nativefs,
            metadata: { rootDirHandle: { root: 'handler' } },
          }),
        },
      },
    });

    await sleep(0);

    expect(saveToHistoryState).toBeCalledTimes(1);
    expect(saveToHistoryState).nthCalledWith(1, 'workspacesRootDir', [
      { root: 'handler' },
    ]);
  });

  test('destroying should not dispatch action', async () => {
    const { store, dispatchSpy } = createStore();

    store.dispatch({
      name: 'action::@bangle.io/slice-workspaces-manager:set-workspace-infos',
      value: {
        workspaceInfos: {
          testWs: createWsInfo({
            name: 'testWs',
            type: WorkspaceType.nativefs,
            metadata: { rootDirHandle: { root: 'handler' } },
          }),
        },
      },
    });

    await sleep(0);

    expect(saveToHistoryState).toBeCalledTimes(1);

    store.destroy();
    await sleep(0);
    expect(saveToHistoryState).toBeCalledTimes(1);
  });

  test('dispatching multipe times does not call it again', async () => {
    const { store, dispatchSpy } = createStore();

    store.dispatch({
      name: 'action::@bangle.io/slice-workspaces-manager:set-workspace-infos',
      value: {
        workspaceInfos: {
          testWs: createWsInfo({
            name: 'testWs',
            type: WorkspaceType.nativefs,
            metadata: { rootDirHandle: { root: 'handler' } },
          }),
        },
      },
    });

    await sleep(0);

    expect(saveToHistoryState).toBeCalledTimes(1);
    expect(saveToHistoryState).nthCalledWith(1, 'workspacesRootDir', [
      { root: 'handler' },
    ]);

    store.dispatch({
      name: 'action::@bangle.io/slice-workspaces-manager:set-workspace-infos',
      value: {
        workspaceInfos: {
          testWs: createWsInfo({
            name: 'testWs',
            type: WorkspaceType.nativefs,
            metadata: { rootDirHandle: { root: 'handler' } },
          }),
        },
      },
    });
    expect(saveToHistoryState).toBeCalledTimes(1);
  });

  test('does not save destroyed workspaces', async () => {
    const { store, dispatchSpy } = createStore();

    store.dispatch({
      name: 'action::@bangle.io/slice-workspaces-manager:set-workspace-infos',
      value: {
        workspaceInfos: {
          testWs: createWsInfo({
            name: 'testWs',
            deleted: true,
            type: WorkspaceType.nativefs,
            metadata: { rootDirHandle: { root: 'handler' } },
          }),
        },
      },
    });

    await sleep(0);

    expect(saveToHistoryState).toBeCalledTimes(1);
    expect(saveToHistoryState).nthCalledWith(1, 'workspacesRootDir', []);
  });
});

describe('refreshWorkspacesEffect', () => {
  test('works', async () => {
    const { store, dispatchSpy } = createStore();

    await sleep(0);
    expect(getActionNamesDispatched(dispatchSpy)).toMatchInlineSnapshot(`
      Array [
        "action::@bangle.io/slice-workspaces-manager:set-workspace-infos",
      ]
    `);

    expect(idb.set).toBeCalledTimes(1);
    expect(idb.set).nthCalledWith(1, 'workspaces/2', []);

    const testWsInfo = createWsInfo({
      name: 'testWs',
      type: WorkspaceType.nativefs,
      metadata: { rootDirHandle: { root: 'handler' } },
    });

    store.dispatch({
      name: 'action::@bangle.io/slice-workspaces-manager:set-workspace-infos',
      value: {
        workspaceInfos: {
          testWs: testWsInfo,
        },
      },
    });

    await sleep(0);
    expect(idb.set).toHaveBeenCalledTimes(2);
    expect(idb.set).nthCalledWith(2, 'workspaces/2', [testWsInfo]);

    // actions which donot result in any update in state donot trigger an idb save
    store.dispatch({
      name: 'action::@bangle.io/slice-workspaces-manager:set-workspace-infos',
      value: {
        workspaceInfos: {
          testWs: createWsInfo({
            name: 'testWs',
            type: WorkspaceType.nativefs,
            metadata: { rootDirHandle: { root: 'handler' } },
          }),
        },
      },
    });
    // non relevant dispatches donot trigger an update to idb
    store.dispatch({
      name: 'action::@bangle.io/some-package',
      value: {},
    } as any);

    expect(idb.set).toHaveBeenCalledTimes(2);

    const modifiedWsInfo = createWsInfo({
      name: 'testWs',
      type: WorkspaceType.nativefs,
      lastModified: 100,
      metadata: { rootDirHandle: { root: 'handler' } },
    });
    // actions which have newer lastModified trigger update
    store.dispatch({
      name: 'action::@bangle.io/slice-workspaces-manager:set-workspace-infos',
      value: {
        workspaceInfos: {
          testWs: modifiedWsInfo,
        },
      },
    });
    await sleep(0);

    expect(idb.set).toHaveBeenCalledTimes(3);
    expect(idb.set).nthCalledWith(3, 'workspaces/2', [modifiedWsInfo]);
  });

  test('does not overwrite existing values', async () => {
    const { store, dispatchSpy } = createStore();

    const testWsInfo = createWsInfo({
      name: 'testWs',
      type: WorkspaceType.nativefs,
      metadata: { rootDirHandle: { root: 'handler' } },
    });

    const testWsInfoExisting = createWsInfo({
      name: 'testWsExisting',
      type: WorkspaceType.nativefs,
      metadata: { rootDirHandle: { root: 'handler' } },
    });

    // some other tab writes data to idb
    await idb.set('workspaces/2', [testWsInfoExisting]);

    store.dispatch({
      name: 'action::@bangle.io/slice-workspaces-manager:set-workspace-infos',
      value: {
        workspaceInfos: {
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
