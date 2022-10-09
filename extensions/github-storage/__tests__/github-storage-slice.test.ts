import { AppState } from '@bangle.io/create-store';

import { ghSliceKey } from '../common';
import { githubStorageSlice } from '../github-storage-slice';

describe('state change', () => {
  let state = AppState.create({
    slices: [githubStorageSlice()],
  });

  beforeEach(() => {
    state = AppState.create({
      slices: [githubStorageSlice()],
    });
  });

  test('SET_CONFLICTED_WS_PATHS', () => {
    state = state.applyAction({
      name: 'action::@bangle.io/github-storage:SET_CONFLICTED_WS_PATHS',
      value: {
        conflictedWsPaths: ['my-ws:test.md'],
      },
    });

    expect(ghSliceKey.getSliceState(state)).toMatchObject({
      conflictedWsPaths: ['my-ws:test.md'],
    });
  });

  test('UPDATE_GITHUB_WS_NAME', () => {
    state = state.applyAction({
      name: 'action::@bangle.io/github-storage:UPDATE_GITHUB_WS_NAME',
      value: {
        githubWsName: 'my-ws',
      },
    });

    expect(ghSliceKey.getSliceState(state)).toMatchObject({
      githubWsName: 'my-ws',
    });
  });

  test('UPDATE_SYNC_STATE', () => {
    state = state.applyAction({
      name: 'action::@bangle.io/github-storage:UPDATE_SYNC_STATE',
      value: {
        isSyncing: true,
      },
    });

    expect(ghSliceKey.getSliceState(state)).toMatchObject({
      isSyncing: true,
    });
  });

  test('RESET_GITHUB_STATE', () => {
    state = state.applyAction({
      name: 'action::@bangle.io/github-storage:UPDATE_GITHUB_WS_NAME',
      value: {
        githubWsName: 'my-ws',
      },
    });

    state = state.applyAction({
      name: 'action::@bangle.io/github-storage:SET_CONFLICTED_WS_PATHS',
      value: {
        conflictedWsPaths: ['my-ws:test.md'],
      },
    });
    state = state.applyAction({
      name: 'action::@bangle.io/github-storage:RESET_GITHUB_STATE',
      value: {},
    });

    expect(ghSliceKey.getSliceState(state)).toEqual({
      githubWsName: undefined,
      conflictedWsPaths: [],
      isSyncing: false,
    });
  });
});
