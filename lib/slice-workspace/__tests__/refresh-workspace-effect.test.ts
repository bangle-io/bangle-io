import * as idb from 'idb-keyval';

import { WorkspaceType } from '@bangle.io/constants';
import { ApplicationStore } from '@bangle.io/create-store';
import {
  getPageLocation,
  historyUpdateOpenedWsPaths,
  pageSliceKey,
} from '@bangle.io/slice-page';
import { mockMemoryHistorySlice } from '@bangle.io/test-basic-store';
import { sleep } from '@bangle.io/utils';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { goToWsNameRoute } from '..';
import { workspaceSliceKey } from '../common';
import { createWorkspace } from '../workspaces-operations';
import {
  createStore,
  createWsInfo,
  getActionNamesDispatched,
} from './test-utils';

const getDispatch = (store: ApplicationStore) =>
  workspaceSliceKey.getDispatch(store.dispatch);

describe('refreshWorkspacesEffect', () => {
  test('works', async () => {
    const { store, dispatchSpy } = createStore();

    await sleep(0);
    expect(getActionNamesDispatched(dispatchSpy)).toMatchInlineSnapshot(`
      Array [
        "action::@bangle.io/slice-workspace:set-workspace-infos",
        "action::@bangle.io/slice-workspace:set-opened-workspace",
      ]
    `);

    expect(idb.set).toBeCalledTimes(1);
    expect(idb.set).nthCalledWith(1, 'workspaces/2', []);

    const testWsInfo = createWsInfo({
      name: 'testWs',
      type: WorkspaceType.nativefs,
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
            type: WorkspaceType.nativefs,
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
      type: WorkspaceType.nativefs,
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
    [mockMemoryHistorySlice()],
  );

  beforeEach(() => {
    ({ store, getActionNames, getAction, dispatchSpy } = createStore(
      undefined,
      undefined,
      undefined,
      [mockMemoryHistorySlice()],
    ));
  });

  test('opens a newly created workspace', async () => {
    await createWorkspace('test-ws', WorkspaceType.browser)(
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
          openedWsPaths: { wsPaths: [undefined, undefined] },
          wsName: undefined,
        },
      },
      {
        id: expect.any(String),
        name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
        value: {
          openedWsPaths: { wsPaths: [undefined, undefined] },
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
});
