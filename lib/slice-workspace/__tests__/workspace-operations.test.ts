import {
  helpFSWorkspaceInfo,
  WorkspaceTypeBrowser,
  WorkspaceTypeNative,
} from '@bangle.io/constants';
import { Extension } from '@bangle.io/extension-registry';
import { getPageLocation, goToLocation } from '@bangle.io/slice-page';
import { IndexedDbStorageProvider } from '@bangle.io/storage';
import { createBasicTestStore, fakeIdb } from '@bangle.io/test-utils';
import { sleep } from '@bangle.io/utils';

import { workspaceSliceKey } from '../common';
import { WORKSPACE_KEY } from '../read-ws-info';
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspaceInfoAsync,
  listWorkspaces,
} from '../workspaces-operations';

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
    const { store } = createBasicTestStore();

    expect(await listWorkspaces()(store.state, store.dispatch, store)).toEqual([
      helpFSWorkspaceInfo(),
    ]);
  });

  test('cerating a workspace', async () => {
    const { store } = createBasicTestStore();

    await createWorkspace('test-1', WorkspaceTypeBrowser)(
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
        type: WorkspaceTypeBrowser,
      },
    });

    expect(await listWorkspaces()(store.state, store.dispatch, store)).toEqual([
      helpFSWorkspaceInfo(),
      {
        deleted: false,
        lastModified: expect.any(Number),
        metadata: {},
        name: 'test-1',
        type: WorkspaceTypeBrowser,
      },
    ]);
  });

  test('hides deleted workspaces', async () => {
    const { store } = createBasicTestStore();
    await createWorkspace('test-0', WorkspaceTypeBrowser)(
      store.state,
      store.dispatch,
      store,
    );
    await createWorkspace('test-1', WorkspaceTypeBrowser)(
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
        type: WorkspaceTypeBrowser,
      },
    });

    expect(
      await listWorkspaces()(store.state, store.dispatch, store),
    ).toHaveLength(2);
  });
});

describe('createWorkspace', () => {
  test('works', async () => {
    const { store } = createBasicTestStore();

    await createWorkspace('test-1', WorkspaceTypeBrowser)(
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
        type: WorkspaceTypeBrowser,
      },
    });
  });

  test('throws error when workspace already exists', async () => {
    const { store } = createBasicTestStore();

    await createWorkspace('test-1', WorkspaceTypeBrowser)(
      store.state,
      store.dispatch,
      store,
    );

    await expect(
      createWorkspace('test-1', WorkspaceTypeBrowser)(
        store.state,
        store.dispatch,
        store,
      ),
    ).rejects.toThrowError(`Cannot create "test-1" as it already exists`);
  });

  test('saves workspace metadata correctly', async () => {
    class TestProvider extends IndexedDbStorageProvider {
      name = WorkspaceTypeNative;

      async newWorkspaceMetadata(wsName: string, createOpts: any) {
        return createOpts;
      }
    }

    const provider = new TestProvider();
    const newWorkspaceMetadataSpy = jest.spyOn(
      provider,
      'newWorkspaceMetadata',
    );

    const { store } = createBasicTestStore({
      sliceKey: workspaceSliceKey,
      extensions: [
        Extension.create({
          name: 'test-storage-extension',
          application: {
            storageProvider: provider,
            onStorageError: () => false,
          },
        }),
      ],
    });

    await createWorkspace('test-1', WorkspaceTypeNative, {
      rootDirHandle: { root: 'dummy' },
    })(store.state, store.dispatch, store);

    expect(newWorkspaceMetadataSpy).toBeCalledTimes(1);

    expect(await getWorkspaceInfoAsync('test-1')(store.state)).toEqual({
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
    const { store } = createBasicTestStore();

    await expect(
      deleteWorkspace('test-1')(store.state, store.dispatch, store),
    ).rejects.toThrowError(`Workspace test-1 not found`);
  });

  test('deleting a workspace adds a delete field', async () => {
    const { store } = createBasicTestStore();
    await createWorkspace('test-1', WorkspaceTypeNative, {})(
      store.state,
      store.dispatch,
      store,
    );

    await deleteWorkspace('test-1')(store.state, store.dispatch, store);

    expect(await fakeIdb.get(WORKSPACE_KEY)).toEqual([
      {
        deleted: true,
        lastModified: expect.any(Number),
        metadata: {},
        name: 'test-1',
        type: WorkspaceTypeNative,
      },
    ]);
  });

  test('redirects correctly for a deleted workspace', async () => {
    const { store } = createBasicTestStore();

    await createWorkspace('test-1', WorkspaceTypeNative, {
      rootDirHandle: { root: 'dummy' },
    })(store.state, store.dispatch, store);

    expect(workspaceSliceKey.getSliceStateAsserted(store.state).wsName).toBe(
      'test-1',
    );

    expect(goToLocation).nthCalledWith(1, '/ws/test-1');

    await deleteWorkspace('test-1')(store.state, store.dispatch, store);
    await sleep(0);

    expect(workspaceSliceKey.getSliceStateAsserted(store.state).wsName).toBe(
      undefined,
    );

    expect(getPageLocation()(store.state)?.pathname).toEqual('/');
  });
});

describe('getWorkspaceInfo', () => {
  test('throws error if workspace does not exists', async () => {
    const { store } = createBasicTestStore();

    await expect(
      getWorkspaceInfoAsync('test-1')(store.state),
    ).rejects.toThrowError(`Workspace test-1 not found`);
  });

  test('retains instance', async () => {
    const { store } = createBasicTestStore();

    await createWorkspace('test-1', WorkspaceTypeBrowser)(
      store.state,
      store.dispatch,
      store,
    );

    const wsInfo = await getWorkspaceInfoAsync('test-1')(store.state);

    await createWorkspace('test-2', WorkspaceTypeBrowser)(
      store.state,
      store.dispatch,
      store,
    );

    await createWorkspace('test-3', WorkspaceTypeBrowser)(
      store.state,
      store.dispatch,
      store,
    );

    await deleteWorkspace('test-2')(store.state, store.dispatch, store);

    await createWorkspace('test-4', WorkspaceTypeBrowser)(
      store.state,
      store.dispatch,
      store,
    );

    expect(await getWorkspaceInfoAsync('test-1')(store.state)).toBe(wsInfo);
  });
});
