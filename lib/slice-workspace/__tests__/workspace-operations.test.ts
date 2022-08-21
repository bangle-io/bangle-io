import {
  WorkspaceTypeBrowser,
  WorkspaceTypeNative,
} from '@bangle.io/constants';
import { Extension } from '@bangle.io/extension-registry';
import { getPageLocation, goToLocation } from '@bangle.io/slice-page';
import { IndexedDbStorageProvider } from '@bangle.io/storage';
import { createBasicTestStore, waitForExpect } from '@bangle.io/test-utils';
import { sleep } from '@bangle.io/utils';

import { helpFSWorkspaceInfo, workspaceSliceKey } from '../common';
import { readWorkspaceInfo, readWorkspacesInfoReg } from '../read-ws-info';
import {
  createWorkspace,
  deleteWorkspace,
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

let abortController = new AbortController();
let signal = abortController.signal;

const dateNow = Date.now;
let counter = 0;
beforeEach(() => {
  abortController = new AbortController();
  signal = abortController.signal;
  // This avoids the flakiness with ws deletion
  Date.now = jest.fn(() => counter++);
});

afterEach(() => {
  Date.now = dateNow;
  abortController.abort();
});

describe('listAllFiles', () => {
  test('when blank has help-fs', async () => {
    const { store } = createBasicTestStore({ signal });

    expect(await listWorkspaces()(store.state, store.dispatch, store)).toEqual([
      helpFSWorkspaceInfo(),
    ]);
  });

  test('cerating a workspace', async () => {
    const { store } = createBasicTestStore({ signal });

    await createWorkspace('test-1', WorkspaceTypeBrowser)(
      store.state,
      store.dispatch,
      store,
    );

    expect(goToLocation).toBeCalledTimes(1);
    expect(goToLocation).nthCalledWith(1, '/ws/test-1');
    expect(await readWorkspaceInfo('test-1')).toMatchObject({
      deleted: false,
      lastModified: expect.any(Number),
      metadata: {},
      name: 'test-1',
      type: WorkspaceTypeBrowser,
    });

    expect(await listWorkspaces()(store.state, store.dispatch, store)).toEqual(
      [
        helpFSWorkspaceInfo(),
        {
          deleted: false,
          lastModified: expect.any(Number),
          metadata: {},
          name: 'test-1',
          type: WorkspaceTypeBrowser,
        },
      ].sort((a, b) => a.name.localeCompare(b.name)),
    );
  });

  test('hides deleted workspaces', async () => {
    const { store } = createBasicTestStore({ signal });
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

    expect(await readWorkspaceInfo('test-1')).toBe(undefined);
    expect(
      await readWorkspaceInfo('test-1', { allowDeleted: true }),
    ).toMatchObject({
      deleted: true,
      lastModified: expect.any(Number),
      metadata: {},
      name: 'test-1',
      type: WorkspaceTypeBrowser,
    });

    expect(
      await listWorkspaces()(store.state, store.dispatch, store),
    ).toHaveLength(2);
  });
});

describe('createWorkspace', () => {
  test('works', async () => {
    const { store } = createBasicTestStore({ signal });

    await createWorkspace('test-1', WorkspaceTypeBrowser)(
      store.state,
      store.dispatch,
      store,
    );

    expect(await readWorkspaceInfo('test-1')).toMatchObject({
      deleted: false,
      lastModified: expect.any(Number),
      metadata: {},
      name: 'test-1',
      type: WorkspaceTypeBrowser,
    });
  });

  test('throws error when workspace already exists', async () => {
    const { store } = createBasicTestStore({ signal });

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
      signal,
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

    expect(await readWorkspaceInfo('test-1')).toEqual({
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
    const { store } = createBasicTestStore({ signal });

    await expect(
      deleteWorkspace('test-1')(store.state, store.dispatch, store),
    ).rejects.toThrowError(`Workspace test-1 not found`);
  });

  test('deleting a workspace adds a delete field', async () => {
    const { store } = createBasicTestStore({ signal });
    await createWorkspace('test-1', WorkspaceTypeBrowser, {})(
      store.state,
      store.dispatch,
      store,
    );

    await deleteWorkspace('test-1')(store.state, store.dispatch, store);

    expect(await readWorkspacesInfoReg()).toMatchObject({
      'test-1': {
        deleted: true,
        lastModified: expect.any(Number),
        metadata: {},
        name: 'test-1',
        type: WorkspaceTypeBrowser,
      },
    });
  });

  test('redirects correctly for a deleted workspace', async () => {
    const { store } = createBasicTestStore({ signal });

    await createWorkspace('test-1', WorkspaceTypeBrowser, {
      rootDirHandle: { root: 'dummy' },
    })(store.state, store.dispatch, store);
    await waitForExpect(() =>
      expect(workspaceSliceKey.getSliceStateAsserted(store.state).wsName).toBe(
        'test-1',
      ),
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
