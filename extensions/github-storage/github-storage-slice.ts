import { Slice, SliceKey, workspace } from '@bangle.io/api';

import { handleError } from './error-handling';
import { localFileEntryManager } from './file-entry-manager';
import { isCurrentWorkspaceGithubStored, syncWithGithub } from './operations';

const LOG = true;
const debug = LOG
  ? console.debug.bind(console, 'github-storage-slice')
  : () => {};

const sliceKey = new SliceKey<
  {
    refreshGithubCounter: number;
  },
  {
    name: 'action::@bangle.io/github-storage:INCREMENT_REFRESH_GITHUB_COUNTER';
    value: {};
  }
>('slice::@bangle.io/github-storage:slice-key');

export function githubStorageSlice() {
  return new Slice({
    key: sliceKey,
    state: {
      init() {
        return {
          refreshGithubCounter: 0,
        };
      },
      apply(action, value, appState) {
        switch (action.name) {
          case 'action::@bangle.io/github-storage:INCREMENT_REFRESH_GITHUB_COUNTER': {
            return {
              ...value,
              refreshGithubCounter: value.refreshGithubCounter + 1,
            };
          }
          default: {
            return value;
          }
        }
      },
    },
    sideEffect: [],
    onError: (error: any, store) => {
      return handleError(error, store);
    },
  });
}

const pullGithubChangesEffect = sliceKey.effect(() => {
  return {
    async deferredUpdate(store, prevState) {
      const wsName = workspace.workspaceSliceKey.getValueIfChanged(
        'wsName',
        store.state,
        prevState,
      );

      if (!wsName) {
        return;
      }

      if (!isCurrentWorkspaceGithubStored(wsName)(store.state)) {
        return;
      }

      debug('running pullGithubChangesEffect');

      await syncWithGithub(
        wsName,
        new AbortController().signal,
        localFileEntryManager,
      )(store.state, store.dispatch, store);
    },
  };
});
