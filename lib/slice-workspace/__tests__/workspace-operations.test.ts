import {
  WorkspaceTypeBrowser,
  WorkspaceTypeHelp,
  WorkspaceTypeNative,
} from '@bangle.io/constants';
import { Extension } from '@bangle.io/extension-registry';
import { getPageLocation, goToLocation } from '@bangle.io/slice-page';
import { IndexedDbStorageProvider } from '@bangle.io/storage';
import { createBasicTestStore, waitForExpect } from '@bangle.io/test-utils';
import { sleep } from '@bangle.io/utils';
import {
  helpFSWorkspaceInfo,
  readAllWorkspacesInfo,
  readWorkspaceInfo,
} from '@bangle.io/workspace-info';

import { workspaceSliceKey } from '../common';
import { WorkspaceError, WorkspaceErrorCode } from '../errors';
import { getWsName } from '../operations';
import {
  createWorkspace,
  deleteWorkspace,
  handleWorkspaceError,
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
    const { store } = createBasicTestStore({});

    expect(await readAllWorkspacesInfo()).toEqual([helpFSWorkspaceInfo()]);
  });

  test('cerating a workspace', async () => {
    const { store } = createBasicTestStore({});

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

    expect(await readAllWorkspacesInfo()).toEqual(
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
    const { store } = createBasicTestStore({});
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

    expect(await readAllWorkspacesInfo()).toHaveLength(3);

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

    expect(await readAllWorkspacesInfo()).toHaveLength(2);
  });
});

describe('createWorkspace', () => {
  test('works', async () => {
    const { store } = createBasicTestStore({});

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
    const { store } = createBasicTestStore({});

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

  test('creates a workspace which was previously deleted', async () => {
    const { store } = createBasicTestStore({});

    await createWorkspace('test-1', WorkspaceTypeBrowser, {})(
      store.state,
      store.dispatch,
      store,
    );

    await waitForExpect(() => expect(getWsName()(store.state)).toBe('test-1'));

    await deleteWorkspace('test-1')(store.state, store.dispatch, store);

    expect(await readWorkspaceInfo('test-1')).toBe(undefined);

    await waitForExpect(() => expect(getWsName()(store.state)).toBe(undefined));

    // create again
    await createWorkspace('test-1', WorkspaceTypeBrowser, {})(
      store.state,
      store.dispatch,
      store,
    );

    await waitForExpect(() => expect(getWsName()(store.state)).toBe('test-1'));
    expect(await readWorkspaceInfo('test-1')).toBeDefined();
  });
});

describe('deleteWorkspace', () => {
  test('throws error if workspace does not exists', async () => {
    const { store } = createBasicTestStore({});

    await expect(
      deleteWorkspace('test-1')(store.state, store.dispatch, store),
    ).rejects.toThrowError(`Workspace test-1 not found`);
  });

  test('deleting a workspace adds a delete field', async () => {
    const { store } = createBasicTestStore({});
    await createWorkspace('test-1', WorkspaceTypeBrowser, {})(
      store.state,
      store.dispatch,
      store,
    );

    await deleteWorkspace('test-1')(store.state, store.dispatch, store);

    expect(await readAllWorkspacesInfo({ allowDeleted: true })).toEqual([
      {
        deleted: false,
        lastModified: expect.any(Number),
        metadata: {
          allowLocalChanges: true,
        },
        name: 'bangle-help',
        type: WorkspaceTypeHelp,
      },
      {
        deleted: true,
        lastModified: expect.any(Number),
        metadata: {},
        name: 'test-1',
        type: WorkspaceTypeBrowser,
      },
    ]);
  });

  test('redirects correctly for a deleted workspace', async () => {
    const { store } = createBasicTestStore({});

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

    await waitForExpect(() => {
      expect(workspaceSliceKey.getSliceStateAsserted(store.state).wsName).toBe(
        undefined,
      );
    });

    expect(getPageLocation()(store.state)?.pathname).toEqual('/landing');
    expect(getPageLocation()(store.state)?.pathname).toEqual('/landing');
  });
});

describe('error handling', () => {
  test('does not handle WORKSPACE_ALREADY_EXISTS_ERROR', async () => {
    const { store } = createBasicTestStore({});

    expect(
      handleWorkspaceError(
        new WorkspaceError({
          message: `Cannot create "my-ws" as it already exists`,
          code: WorkspaceErrorCode.WORKSPACE_ALREADY_EXISTS_ERROR,
        }),
      )(store.state, store.dispatch),
    ).toBe(false);
  });

  test('handles WORKSPACE_NOT_FOUND_ERROR', async () => {
    const { store } = createBasicTestStore({});

    expect(
      handleWorkspaceError(
        new WorkspaceError({
          message: `Not found`,
          code: WorkspaceErrorCode.WORKSPACE_NOT_FOUND_ERROR,
        }),
      )(store.state, store.dispatch),
    ).toBe(true);

    await waitForExpect(() => {
      expect(getPageLocation()(store.state)?.pathname).toEqual('/landing');
    });
  });

  test('does not handle unknown errors', async () => {
    const { store } = createBasicTestStore({});

    expect(
      handleWorkspaceError(new Error('wow'))(store.state, store.dispatch),
    ).toBe(false);
  });
});
