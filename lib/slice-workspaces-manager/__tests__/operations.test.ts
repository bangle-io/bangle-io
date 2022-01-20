// Need to disable sort to make the mocking run first.
// eslint-disable-next-line simple-import-sort/imports
import mockBabyFs from '@bangle.io/test-utils/baby-fs-test-mock';

import { deleteWorkspace, workspacesSliceKey, WorkspaceType } from '..';
import { helpFSWorkspaceInfo } from '../common';
import {
  createWorkspace,
  getWorkspaceInfo,
  listWorkspaces,
} from '../operations';
import { createStore } from './test-utils';
import { goToLocation } from '@bangle.io/slice-page';

const dateNow = Date.now;

jest.mock('@bangle.io/slice-page', () => {
  const remaining = jest.requireActual('@bangle.io/slice-page');
  return {
    ...remaining,
    getPageLocation: jest.fn(() => () => {}),
    saveToHistoryState: jest.fn(() => () => {}),
    goToLocation: jest.fn(() => () => {}),
  };
});

let goToLocationMock = goToLocation as jest.MockedFunction<typeof goToLocation>;

beforeEach(() => {
  mockBabyFs.mockStore.clear();
  Date.now = jest.fn(() => 1);
  goToLocationMock.mockImplementation(() => () => {});
});
afterEach(() => {
  Date.now = dateNow;
});

describe('listAllFiles', () => {
  test('when blank has help-fs', async () => {
    const { store } = createStore();

    expect(await listWorkspaces()(store.state, store.dispatch, store)).toEqual([
      helpFSWorkspaceInfo(),
    ]);
  });

  test('when a workspace exists', async () => {
    const { store } = createStore();

    await createWorkspace('test-1', WorkspaceType['browser'])(
      store.state,
      store.dispatch,
      store,
    );

    expect(
      workspacesSliceKey.getSliceState(store.state)?.workspaceInfos,
    ).toMatchObject({
      'test-1': {
        deleted: false,
        lastModified: Date.now(),
        metadata: {},
        name: 'test-1',
        type: 'browser',
      },
    });

    expect(await listWorkspaces()(store.state, store.dispatch, store)).toEqual([
      helpFSWorkspaceInfo(),
      {
        deleted: false,
        lastModified: Date.now(),
        metadata: {},
        name: 'test-1',
        type: 'browser',
      },
    ]);
  });

  test('hides deleted workspaces', async () => {
    const { store } = createStore();
    await createWorkspace('test-0', WorkspaceType['browser'])(
      store.state,
      store.dispatch,
      store,
    );
    await createWorkspace('test-1', WorkspaceType['browser'])(
      store.state,
      store.dispatch,
      store,
    );

    expect(
      await listWorkspaces()(store.state, store.dispatch, store),
    ).toHaveLength(3);

    // advance the clock, as it is needed for the deletion step
    Date.now = jest.fn(() => 2);

    await deleteWorkspace('test-1')(store.state, store.dispatch, store);

    expect(
      workspacesSliceKey.getSliceState(store.state)?.workspaceInfos,
    ).toMatchObject({
      'test-1': {
        deleted: true,
        lastModified: 2,
        metadata: {},
        name: 'test-1',
        type: 'browser',
      },
    });

    expect(
      await listWorkspaces()(store.state, store.dispatch, store),
    ).toHaveLength(2);
  });
});

describe('createWorkspace', () => {
  test('works', async () => {
    const { store } = createStore();

    await createWorkspace('test-1', WorkspaceType['browser'])(
      store.state,
      store.dispatch,
      store,
    );

    expect(
      workspacesSliceKey.getSliceState(store.state)?.workspaceInfos,
    ).toMatchObject({
      'test-1': {
        deleted: false,
        lastModified: Date.now(),
        metadata: {},
        name: 'test-1',
        type: 'browser',
      },
    });
  });

  test('throws error when workspace already exists', async () => {
    const { store } = createStore();

    await createWorkspace('test-1', WorkspaceType['browser'])(
      store.state,
      store.dispatch,
      store,
    );

    await expect(
      createWorkspace('test-1', WorkspaceType['browser'])(
        store.state,
        store.dispatch,
        store,
      ),
    ).rejects.toThrowError(
      `WORKSPACE_ALREADY_EXISTS_ERROR:Cannot create "test-1" as it already exists`,
    );
  });

  test('creates nativefs without dir handle', async () => {
    const { store } = createStore();

    await expect(
      createWorkspace('test-1', WorkspaceType['nativefs'])(
        store.state,
        store.dispatch,
        store,
      ),
    ).rejects.toThrowError(
      'rootDirHandle is necessary for creating nativefs of workspaces',
    );
  });

  test('creates nativefs with dir handle', async () => {
    const { store } = createStore();

    await createWorkspace('test-1', WorkspaceType['nativefs'], {
      rootDirHandle: { root: 'dummy' },
    })(store.state, store.dispatch, store);

    expect(
      await getWorkspaceInfo('test-1')(store.state, store.dispatch, store),
    ).toEqual({
      deleted: false,
      lastModified: 1,
      metadata: {
        rootDirHandle: { root: 'dummy' },
      },
      name: 'test-1',
      type: 'nativefs',
    });
  });
});

describe('deleteWorkspace', () => {
  test('throws error if workspace does not exists', async () => {
    const { store } = createStore();

    await expect(
      deleteWorkspace('test-1')(store.state, store.dispatch, store),
    ).rejects.toThrowError(
      `WORKSPACE_NOT_FOUND_ERROR:Workspace test-1 not found`,
    );
  });
});

describe('getWorkspaceInfo', () => {
  test('throws error if workspace does not exists', async () => {
    const { store } = createStore();

    await expect(
      getWorkspaceInfo('test-1')(store.state, store.dispatch, store),
    ).rejects.toThrowError(
      `WORKSPACE_NOT_FOUND_ERROR:Workspace test-1 not found`,
    );
  });

  test('retains instance', async () => {
    const { store } = createStore();

    await createWorkspace('test-1', WorkspaceType['browser'])(
      store.state,
      store.dispatch,
      store,
    );

    const wsInfo = await getWorkspaceInfo('test-1')(
      store.state,
      store.dispatch,
      store,
    );

    await createWorkspace('test-2', WorkspaceType['browser'])(
      store.state,
      store.dispatch,
      store,
    );

    await createWorkspace('test-3', WorkspaceType['browser'])(
      store.state,
      store.dispatch,
      store,
    );

    await deleteWorkspace('test-2')(store.state, store.dispatch, store);

    await createWorkspace('test-4', WorkspaceType['browser'])(
      store.state,
      store.dispatch,
      store,
    );

    expect(
      await getWorkspaceInfo('test-1')(store.state, store.dispatch, store),
    ).toBe(wsInfo);
  });
});
