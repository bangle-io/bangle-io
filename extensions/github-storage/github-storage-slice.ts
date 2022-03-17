import { Slice, SliceKey } from '@bangle.io/create-store';
import {
  getStorageProviderOpts,
  getWsName,
  workspaceSliceKey,
} from '@bangle.io/slice-workspace';

import { localFileEntryManager } from './file-entry-manager';
import { GithubWsMetadata, isGithubStorageProvider } from './helpers';
import { pullGithubChanges } from './pull-github-changes';

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
    sideEffect: [refreshGithubCounterEffect, pullGithubChangesEffect],
  });
}

const refreshGithubCounterEffect = sliceKey.effect(() => {
  return {
    deferredUpdate(store, prevState) {
      const wsName = workspaceSliceKey.getValueIfChanged(
        'wsName',
        store.state,
        prevState,
      );
      if (!wsName) {
        return;
      }

      if (!isGithubStorageProvider()(store.state)) {
        return;
      }

      store.dispatch({
        name: 'action::@bangle.io/github-storage:INCREMENT_REFRESH_GITHUB_COUNTER',
        value: {},
      });
    },
  };
});

const pullGithubChangesEffect = sliceKey.effect(() => {
  return {
    async deferredUpdate(store, prevState) {
      const refreshGithubCounter = sliceKey.getValueIfChanged(
        'refreshGithubCounter',
        store.state,
        prevState,
      );

      if (refreshGithubCounter == null) {
        return;
      }

      const wsName = getWsName()(workspaceSliceKey.getState(store.state));

      if (!wsName) {
        return;
      }

      if (!isGithubStorageProvider()(store.state)) {
        return;
      }

      const storageOpts = getStorageProviderOpts()(
        workspaceSliceKey.getState(store.state),
        workspaceSliceKey.getDispatch(store.dispatch),
      );

      const wsMetadata =
        storageOpts.readWorkspaceMetadata() as GithubWsMetadata;

      await pullGithubChanges(
        wsName,
        localFileEntryManager,
        wsMetadata,
        new AbortController().signal,
      );
    },
  };
});
