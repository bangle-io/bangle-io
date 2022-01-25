import { helpFSWorkspaceInfo, WorkspaceType } from '@bangle.io/constants';
import { goToLocation, syncPageLocation } from '@bangle.io/slice-page';
import { fakeIdb } from '@bangle.io/test-utils';

import { workspaceSliceKey } from '../common';
import { WORKSPACE_KEY } from '../workspaces/read-ws-info';
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspaceInfo,
  listWorkspaces,
} from '../workspaces-operations';
import { createStore } from './test-utils';

jest.mock('@bangle.io/slice-page', () => {
  const remaining = Object.assign(
    {},
    jest.requireActual('@bangle.io/slice-page'),
  );
  return {
    ...remaining,
    goToLocation: jest.spyOn(remaining, 'goToLocation'),
  };
});

const dateNow = Date.now;
let counter = 0;
beforeEach(() => {
  // This avoids the flakiness with ws deletion
  Date.now = jest.fn(() => counter++);
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

  test('cerating a workspace', async () => {
    const { store } = createStore();

    await createWorkspace('test-1', WorkspaceType['browser'])(
      store.state,
      store.dispatch,
      store,
    );

    expect(goToLocation).toBeCalledTimes(1);
    expect(goToLocation).nthCalledWith(1, '/ws/test-1');
    expect(
      workspaceSliceKey.getSliceState(store.state)?.workspacesInfo,
    ).toMatchObject({
      'test-1': {
        deleted: false,
        lastModified: expect.any(Number),
        metadata: {},
        name: 'test-1',
        type: 'browser',
      },
    });

    expect(await listWorkspaces()(store.state, store.dispatch, store)).toEqual([
      helpFSWorkspaceInfo(),
      {
        deleted: false,
        lastModified: expect.any(Number),
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

    await deleteWorkspace('test-1')(store.state, store.dispatch, store);

    expect(
      workspaceSliceKey.getSliceState(store.state)?.workspacesInfo,
    ).toMatchObject({
      'test-1': {
        deleted: true,
        lastModified: expect.any(Number),
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
      workspaceSliceKey.getSliceState(store.state)?.workspacesInfo,
    ).toMatchObject({
      'test-1': {
        deleted: false,
        lastModified: expect.any(Number),
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

    expect(await getWorkspaceInfo('test-1')(store.state)).toEqual({
      deleted: false,
      lastModified: expect.any(Number),
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

  test('deleting a workspace adds a delete field', async () => {
    const { store } = createStore();
    await createWorkspace('test-1', WorkspaceType['nativefs'], {
      rootDirHandle: { root: 'dummy' },
    })(store.state, store.dispatch, store);

    syncPageLocation({ pathname: '/ws/test-1' })(store.state, store.dispatch);

    await deleteWorkspace('test-1')(store.state, store.dispatch, store);

    expect(await fakeIdb.get(WORKSPACE_KEY)).toEqual([
      {
        deleted: true,
        lastModified: expect.any(Number),
        metadata: {
          rootDirHandle: {
            root: 'dummy',
          },
        },
        name: 'test-1',
        type: 'nativefs',
      },
    ]);
  });

  test('takes to home page if deleting currently open workspace', async () => {
    const { store } = createStore();
    await createWorkspace('test-1', WorkspaceType['nativefs'], {
      rootDirHandle: { root: 'dummy' },
    })(store.state, store.dispatch, store);

    syncPageLocation({ pathname: '/ws/test-1' })(store.state, store.dispatch);

    await deleteWorkspace('test-1')(store.state, store.dispatch, store);

    expect(goToLocation).toBeCalledTimes(2);
    expect(goToLocation).nthCalledWith(1, '/ws/test-1');
    expect(goToLocation).nthCalledWith(2, '/', { replace: true });
  });
});

describe('getWorkspaceInfo', () => {
  test('throws error if workspace does not exists', async () => {
    const { store } = createStore();

    await expect(getWorkspaceInfo('test-1')(store.state)).rejects.toThrowError(
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

    const wsInfo = await getWorkspaceInfo('test-1')(store.state);

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

    expect(await getWorkspaceInfo('test-1')(store.state)).toBe(wsInfo);
  });
});
