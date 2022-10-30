import { notification, page, workspace } from '@bangle.io/api';
import type { SliceSideEffect } from '@bangle.io/create-store';
import {
  createBasicTestStore,
  setupMockWorkspaceWithNotes,
  waitForExpect,
} from '@bangle.io/test-utils';
import { sleep } from '@bangle.io/utils';

import {
  getSyncInterval,
  ghSliceKey,
  GITHUB_STORAGE_PROVIDER_NAME,
} from '../common';
import {
  conflictEffect,
  ghWorkspaceEffect,
  periodSyncEffect,
  setConflictNotification,
  syncEffect,
} from '../github-storage-slice';
import GithubStorageExt from '../index';
import {
  checkForConflicts,
  setConflictedWsPaths,
  syncRunner,
} from '../operations';

jest.mock('@bangle.io/api', () => {
  const originalModule = jest.requireActual('@bangle.io/api');

  return {
    ...originalModule,
    // page: {
    //   ...originalModule.page,
    //   pageLifeCycleTransitionedTo: jest.fn(),
    //   getCurrentPageLifeCycle: jest.fn(),
    // },
    workspace: {
      ...originalModule.workspace,
      readWorkspaceInfo: jest.fn(),
    },
  };
});

jest.mock('../common', () => {
  const originalModule = jest.requireActual('../common');

  return {
    ...originalModule,
    getSyncInterval: jest.fn(),
  };
});

jest.mock('../operations', () => {
  const originalModule = jest.requireActual('../operations');

  return {
    ...originalModule,
    syncRunner: jest.fn(),
    checkForConflicts: jest.fn(),
  };
});

beforeEach(() => {
  jest.mocked(workspace.readWorkspaceInfo).mockImplementation(async () => {
    return undefined;
  });

  jest.mocked(getSyncInterval).mockImplementation(() => {
    return 100;
  });
  jest.mocked(syncRunner).mockImplementation(() => {
    return async () => {};
  });
  jest.mocked(checkForConflicts).mockImplementation(() => {
    return async () => false;
  });
});

let setup = ({
  effects,
  currentPageLifeCycle = 'passive',
}: {
  effects: Array<SliceSideEffect<any, any>>;
  currentPageLifeCycle?: 'passive' | 'active';
}) => {
  if (GithubStorageExt.application?.slices?.[0]?.spec.sideEffect) {
    GithubStorageExt.application.slices[0].spec.sideEffect = effects;
  }

  const { store, getAction } = createBasicTestStore({
    extensions: [GithubStorageExt],
    useEditorManagerSlice: true,
    onError: (err) => {
      throw err;
    },
    overrideInitialSliceState: {
      pageSlice: {
        lifeCycleState: {
          current: currentPageLifeCycle,
          previous: 'frozen',
        },
      },
    },
  });

  return { store: ghSliceKey.getStore(store), getAction };
};

describe('setConflictNotification', () => {
  test('sets and clears notification', async () => {
    const { store } = setup({ effects: [setConflictNotification] });

    setConflictedWsPaths(['test:one.md'])(store.state, store.dispatch);

    await waitForExpect(() => {
      expect(
        ghSliceKey.getSliceStateAsserted(store.state).conflictedWsPaths,
      ).toEqual(['test:one.md']);
    });

    await waitForExpect(() => {
      expect(
        notification.notificationSliceKey.getSliceStateAsserted(store.state)
          .editorIssues,
      ).toEqual([
        {
          description:
            'There is a conflict with test:one.md on Github. Please resolve the conflict on Github and then click on the sync button to resolve the conflict.',
          serialOperation:
            'operation::@bangle.io/github-storage:show-conflict-dialog',
          severity: 'warning',
          title: 'Encountered Conflict',
          uid: expect.any(String),
          wsPath: 'test:one.md',
        },
      ]);
    });

    setConflictedWsPaths(['test:one.md', 'test:two.md'])(
      store.state,
      store.dispatch,
    );

    await waitForExpect(() => {
      expect(
        notification.notificationSliceKey.getSliceStateAsserted(store.state)
          .editorIssues,
      ).toHaveLength(2);
    });

    setConflictedWsPaths(['test:two.md'])(store.state, store.dispatch);

    await waitForExpect(() => {
      expect(
        notification.notificationSliceKey.getSliceStateAsserted(store.state)
          .editorIssues?.[0],
      ).toMatchObject({
        wsPath: 'test:two.md',
      });
    });

    // when there are not conflicts, we should remove the notification
    setConflictedWsPaths([])(store.state, store.dispatch);

    await waitForExpect(() => {
      expect(
        notification.notificationSliceKey.getSliceStateAsserted(store.state)
          .editorIssues,
      ).toHaveLength(0);
    });
  });
});

describe('ghWorkspaceEffect', () => {
  test('sets gh workspace name and unsets', async () => {
    jest.mocked(workspace.readWorkspaceInfo).mockResolvedValue({
      name: 'test-ws-1',
      type: GITHUB_STORAGE_PROVIDER_NAME,
      lastModified: 123,
      metadata: {},
    });
    const { store } = setup({ effects: [ghWorkspaceEffect] });

    await setupMockWorkspaceWithNotes(store, 'test-ws-1', [
      [`test-ws-1:one.md`, `# Hello World 0`],
    ]);

    await waitForExpect(() => {
      expect(
        ghSliceKey.getSliceStateAsserted(store.state).githubWsName,
      ).toEqual('test-ws-1');
    });

    // set to a non gh workspace
    jest.mocked(workspace.readWorkspaceInfo).mockReset();
    await setupMockWorkspaceWithNotes(store, 'test-ws-2', [
      [`test-ws-2:one.md`, `# Hello World 0`],
    ]);

    await waitForExpect(() => {
      expect(
        ghSliceKey.getSliceStateAsserted(store.state).githubWsName,
      ).toEqual(undefined);
    });
  });
});

describe('syncEffect', () => {
  beforeEach(() => {
    jest.mocked(workspace.readWorkspaceInfo).mockResolvedValue({
      name: 'test-ws-1',
      type: GITHUB_STORAGE_PROVIDER_NAME,
      lastModified: 123,
      metadata: {},
    });
  });

  test('runs syncEffect', async () => {
    const { store } = setup({
      effects: [ghWorkspaceEffect, syncEffect],
    });

    await setupMockWorkspaceWithNotes(store, 'test-ws-1', [
      [`test-ws-1:one.md`, `# Hello World 0`],
    ]);

    await waitForExpect(() => {
      expect(
        ghSliceKey.getSliceStateAsserted(store.state).githubWsName,
      ).toEqual('test-ws-1');
    });

    await waitForExpect(() => {
      expect(syncRunner).toHaveBeenCalledTimes(1);
    });

    store.dispatch({
      name: 'action::@bangle.io/github-storage:UPDATE_GITHUB_WS_NAME',
      value: {
        githubWsName: 'test-ws-2',
      },
    });

    await waitForExpect(() => {
      expect(syncRunner).toHaveBeenCalledTimes(2);
    });
  });

  test('runs sync on regular intervals', async () => {
    jest.mocked(getSyncInterval).mockReturnValue(5);

    const { store } = setup({
      currentPageLifeCycle: 'active',
      effects: [ghWorkspaceEffect, periodSyncEffect],
    });

    await setupMockWorkspaceWithNotes(store, 'test-ws-1', [
      [`test-ws-1:one.md`, `# Hello World 0`],
    ]);

    await waitForExpect(() => {
      expect(
        ghSliceKey.getSliceStateAsserted(store.state).githubWsName,
      ).toEqual('test-ws-1');
    });

    await sleep(50);
    const calledTimes = jest.mocked(syncRunner).mock.calls.length;

    expect(calledTimes).toBeGreaterThan(5);

    // if github wsName becomes undefined, it should stop running
    store.dispatch({
      name: 'action::@bangle.io/github-storage:UPDATE_GITHUB_WS_NAME',
      value: {
        githubWsName: undefined,
      },
    });
    await sleep(50);
    expect(jest.mocked(syncRunner).mock.calls.length).toBeLessThanOrEqual(
      calledTimes + 2,
    );
  });
});

describe('conflictEffect', () => {
  beforeEach(() => {
    jest.mocked(workspace.readWorkspaceInfo).mockResolvedValue({
      name: 'test-ws-1',
      type: GITHUB_STORAGE_PROVIDER_NAME,
      lastModified: 123,
      metadata: {},
    });
    jest.mocked(workspace.readWorkspaceInfo).mockResolvedValue({
      name: 'test-ws-2',
      type: GITHUB_STORAGE_PROVIDER_NAME,
      lastModified: 123,
      metadata: {},
    });
  });
  test('checks for conflicts', async () => {
    const { store } = setup({ effects: [ghWorkspaceEffect, conflictEffect] });

    await setupMockWorkspaceWithNotes(store, 'test-ws-1', [
      [`test-ws-1:one.md`, `# Hello World 0`],
    ]);

    await waitForExpect(() => {
      expect(
        ghSliceKey.getSliceStateAsserted(store.state).githubWsName,
      ).toEqual('test-ws-1');
    });

    await waitForExpect(() => {
      expect(checkForConflicts).toHaveBeenCalledTimes(1);
    });

    await setupMockWorkspaceWithNotes(store, 'test-ws-2', [
      [`test-ws-2:one.md`, `# Hello World 0`],
    ]);

    await waitForExpect(() => {
      expect(checkForConflicts).toHaveBeenCalledTimes(2);
    });
  });

  // TODO uncomment this test
  // test('runs check on regular intervals', async () => {
  //   jest.mocked(getSyncInterval).mockReturnValue(5);

  //   const { store } = setup({ effects: [ghWorkspaceEffect, conflictEffect] });

  //   await setupMockWorkspaceWithNotes(store, 'test-ws-1', [
  //     [`test-ws-1:one.md`, `# Hello World 0`],
  //   ]);

  //   await waitForExpect(() => {
  //     expect(
  //       ghSliceKey.getSliceStateAsserted(store.state).githubWsName,
  //     ).toEqual('test-ws-1');
  //   });

  //   await sleep(50);

  //   const calledTimes = jest.mocked(checkForConflicts).mock.calls.length;

  //   expect(calledTimes).toBeGreaterThanOrEqual(5);

  //   // if github wsName becomes undefined, it should stop checking
  //   store.dispatch({
  //     name: 'action::@bangle.io/github-storage:UPDATE_GITHUB_WS_NAME',
  //     value: {
  //       githubWsName: undefined,
  //     },
  //   });

  //   await sleep(50);
  //   expect(jest.mocked(checkForConflicts).mock.calls.length).toBe(calledTimes);
  // });
});
