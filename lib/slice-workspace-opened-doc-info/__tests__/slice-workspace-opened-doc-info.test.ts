import { AppState } from '@bangle.io/create-store';
import { workspaceSliceKey } from '@bangle.io/slice-workspace/common';
import {
  pushWsPath,
  updateOpenedWsPaths,
} from '@bangle.io/slice-workspace/operations';
import {
  createBasicTestStore,
  setupMockWorkspaceWithNotes,
} from '@bangle.io/test-utils';
import { sleep } from '@bangle.io/utils';

import {
  BULK_UPDATE_SHAS,
  SYNC_ENTRIES,
  UPDATE_ENTRY,
  workspaceOpenedDocInfoKey,
} from '../common';
import { workspaceOpenedDocInfoSlice } from '../slice-workspace-opened-doc-info';

const setup = async ({} = {}) => {
  const { store, ...helpers } = createBasicTestStore({
    slices: [workspaceOpenedDocInfoSlice()],
  });

  return {
    store: workspaceOpenedDocInfoKey.getStore(store),
    ...helpers,
  };
};

test('works', async () => {
  const { store } = await setup({});

  expect(workspaceOpenedDocInfoKey.getSliceState(store.state)).toEqual({
    openedFiles: {},
  });
});

describe('action SYNC_ENTRIES', () => {
  test('works', async () => {
    let state = AppState.create({
      slices: [workspaceOpenedDocInfoSlice()],
    });

    state = state.applyAction({
      name: SYNC_ENTRIES,
      value: {
        additions: ['a', 'b'],
        removals: [],
      },
    });

    expect(workspaceOpenedDocInfoKey.getSliceState(state)).toEqual({
      openedFiles: {
        a: {
          pendingWrite: false,
          wsPath: 'a',
        },
        b: {
          pendingWrite: false,
          wsPath: 'b',
        },
      },
    });

    state = state.applyAction({
      name: SYNC_ENTRIES,
      value: {
        additions: ['a'],
        removals: ['b'],
      },
    });

    expect(workspaceOpenedDocInfoKey.getSliceState(state)).toEqual({
      openedFiles: {
        a: {
          pendingWrite: false,
          wsPath: 'a',
        },
      },
    });

    state = state.applyAction({
      name: SYNC_ENTRIES,
      value: {
        additions: [],
        removals: ['b'],
      },
    });
  });
  test('instance is preserved if no-op', async () => {
    let state = AppState.create({
      slices: [workspaceOpenedDocInfoSlice()],
    });

    let newState = state.applyAction({
      name: SYNC_ENTRIES,
      value: {
        additions: [],
        removals: [],
      },
    });

    expect(workspaceOpenedDocInfoKey.getSliceState(state)).toBe(
      workspaceOpenedDocInfoKey.getSliceState(newState),
    );
  });
});

describe('action UPDATE_ENTRY', () => {
  test('works', async () => {
    let state = AppState.create({
      slices: [workspaceOpenedDocInfoSlice()],
    });

    state = state.applyAction({
      name: SYNC_ENTRIES,
      value: {
        additions: ['a'],
        removals: [],
      },
    });

    state = state.applyAction({
      name: UPDATE_ENTRY,
      value: {
        wsPath: 'a',
        info: {
          pendingWrite: true,
        },
      },
    });

    expect(workspaceOpenedDocInfoKey.getSliceState(state)?.openedFiles).toEqual(
      {
        a: {
          pendingWrite: true,
          wsPath: 'a',
        },
      },
    );
  });

  test('ignores wsPath that does not exist', async () => {
    let state = AppState.create({
      slices: [workspaceOpenedDocInfoSlice()],
    });

    state = state.applyAction({
      name: SYNC_ENTRIES,
      value: {
        additions: ['a'],
        removals: [],
      },
    });

    state = state.applyAction({
      name: SYNC_ENTRIES,
      value: {
        additions: [],
        removals: ['a'],
      },
    });

    state = state.applyAction({
      name: UPDATE_ENTRY,
      value: {
        wsPath: 'a',
        info: {
          pendingWrite: true,
        },
      },
    });

    expect(workspaceOpenedDocInfoKey.getSliceState(state)?.openedFiles).toEqual(
      {},
    );
  });
});

describe('action BULK_UPDATE_SHAS', () => {
  test('works', async () => {
    let state = AppState.create({
      slices: [workspaceOpenedDocInfoSlice()],
    });

    state = state.applyAction({
      name: SYNC_ENTRIES,
      value: {
        additions: ['a'],
        removals: [],
      },
    });

    state = state.applyAction({
      name: BULK_UPDATE_SHAS,
      value: {
        data: [
          {
            wsPath: 'a',
            currentDiskSha: 'test-sha',
          },
        ],
      },
    });

    expect(workspaceOpenedDocInfoKey.getSliceState(state)?.openedFiles).toEqual(
      {
        a: {
          currentDiskSha: 'test-sha',
          currentDiskShaTimestamp: expect.any(Number),
          pendingWrite: false,
          wsPath: 'a',
        },
      },
    );
  });

  test('ignores wsPath that does not exist', async () => {
    let state = AppState.create({
      slices: [workspaceOpenedDocInfoSlice()],
    });

    state = state.applyAction({
      name: SYNC_ENTRIES,
      value: {
        additions: ['a', 'b'],
        removals: [],
      },
    });

    state = state.applyAction({
      name: BULK_UPDATE_SHAS,
      value: {
        data: [
          {
            wsPath: 'c',
            currentDiskSha: 'test-sha',
          },
        ],
      },
    });

    expect(workspaceOpenedDocInfoKey.getSliceState(state)?.openedFiles).toEqual(
      {
        a: {
          pendingWrite: false,
          wsPath: 'a',
        },
        b: {
          pendingWrite: false,
          wsPath: 'b',
        },
      },
    );
  });
});

describe('effects', () => {
  test('sync with opened wsPaths', async () => {
    const { store, getAction } = await setup({});

    await setupMockWorkspaceWithNotes(store, 'test-ws', [
      [`test-ws:one.md`, `# Hello World 0`],
      [`test-ws:two.md`, `# Hello World 1`],
    ]);

    workspaceSliceKey.callOp(
      store.state,
      store.dispatch,
      updateOpenedWsPaths((openedWsPath) => {
        return openedWsPath
          .updatePrimaryWsPath('test-ws:one.md')
          .updateSecondaryWsPath('test-ws:two.md');
      }),
    );

    await sleep(0);

    expect(
      workspaceOpenedDocInfoKey.getSliceState(store.state)?.openedFiles,
    ).toEqual({
      'test-ws:one.md': {
        pendingWrite: false,
        wsPath: 'test-ws:one.md',
      },
      'test-ws:two.md': {
        pendingWrite: false,
        wsPath: 'test-ws:two.md',
      },
    });

    expect(getAction(SYNC_ENTRIES)).toEqual([
      // the first two are due to setup mock workspace creating one.md, then pushing it
      // to primary and then creating two.md, then pushing it to primary.
      {
        id: expect.any(String),
        name: 'action::@bangle.io/slice-workspace-opened-doc-info:sync-entries',
        value: {
          additions: ['test-ws:one.md'],
          removals: [],
        },
      },
      {
        id: expect.any(String),
        name: 'action::@bangle.io/slice-workspace-opened-doc-info:sync-entries',
        value: {
          additions: ['test-ws:two.md'],
          removals: ['test-ws:one.md'],
        },
      },

      {
        id: expect.any(String),
        name: 'action::@bangle.io/slice-workspace-opened-doc-info:sync-entries',
        value: {
          additions: ['test-ws:one.md'],
          removals: [],
        },
      },
    ]);

    // should not dispatch any other action if no changes

    store.dispatch({
      name: 'some-other-action',
      value: {},
    } as any);

    expect(getAction(SYNC_ENTRIES)).toHaveLength(3);
  });
});
