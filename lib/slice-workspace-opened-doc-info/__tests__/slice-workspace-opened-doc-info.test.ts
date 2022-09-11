import { AppState } from '@bangle.io/create-store';
import { createBasicTestStore } from '@bangle.io/test-utils';

import {
  BULK_UPDATE_SHAS,
  SYNC_ENTRIES,
  UPDATE_ENTRY,
  workspaceOpenedDocInfoKey,
} from '../common';
import { workspaceOpenedDocInfoSlice } from '../slice-workspace-opened-doc-info';

const setup = async () => {
  const { store, ...helpers } = createBasicTestStore({
    slices: [workspaceOpenedDocInfoSlice()],
  });

  return {
    store: workspaceOpenedDocInfoKey.getStore(store),
    ...helpers,
  };
};

test('works', async () => {
  const { store } = await setup();

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
