import { page, Slice, workspace } from '@bangle.io/api';
import { abortableSetInterval } from '@bangle.io/utils';

import { ghSliceKey, GITHUB_STORAGE_PROVIDER_NAME } from './common';
import { handleError } from './error-handling';
import { localFileEntryManager } from './file-entry-manager';
import { syncWithGithub } from './operations';

const LOG = true;
const debug = LOG
  ? console.debug.bind(console, 'github-storage-slice')
  : () => {};

const SYNC_INTERVAL = 5 * 1000 * 60;

export function githubStorageSlice() {
  return new Slice({
    key: ghSliceKey,
    state: {
      init() {
        return {
          syncState: false,
          githubWsName: undefined,
        };
      },
      apply(action, state) {
        switch (action.name) {
          case 'action::@bangle.io/github-storage:UPDATE_SYNC_STATE': {
            const existingSyncState = state.syncState;

            if (existingSyncState === action.value.syncState) {
              return state;
            }

            return {
              ...state,
              syncState: action.value.syncState,
            };
          }
          case 'action::@bangle.io/github-storage:UPDATE_GITHUB_WS_NAME': {
            const existingData = state.githubWsName;

            if (existingData === action.value.githubWsName) {
              return state;
            }

            return {
              ...state,
              githubWsName: action.value.githubWsName,
            };
          }
          default: {
            return state;
          }
        }
      },
    },
    sideEffect: [isGhWorkspaceEffect, syncEffect],
    onError: (error: any, store) => {
      return handleError(error, store);
    },
  });
}

const isGhWorkspaceEffect = ghSliceKey.effect(() => {
  return {
    async deferredUpdate(store, prevState) {
      const wsName = workspace.workspaceSliceKey.getValueIfChanged(
        'wsName',
        store.state,
        prevState,
      );

      if (wsName) {
        const isGhWorkspace = await isGithubWorkspace(wsName);
        const currentWsName = workspace.workspaceSliceKey.callQueryOp(
          store.state,
          workspace.getWsName(),
        );

        if (currentWsName === wsName) {
          store.dispatch({
            name: 'action::@bangle.io/github-storage:UPDATE_GITHUB_WS_NAME',
            value: {
              githubWsName: isGhWorkspace ? wsName : undefined,
            },
          });
        }
      }
    },
  };
});

const syncEffect = ghSliceKey.effect(() => {
  return {
    deferredOnce(store, signal) {
      abortableSetInterval(
        () => {
          const { githubWsName } = ghSliceKey.getSliceStateAsserted(
            store.state,
          );

          const pageLifecycle = page.getCurrentPageLifeCycle()(store.state);

          if (githubWsName && pageLifecycle === 'active') {
            debug('Period Github sync in background');
            // TODO if there were merge conflicts, this will become very noisy
            syncWithGithub(
              githubWsName,
              new AbortController().signal,
              localFileEntryManager(),
              false,
            )(store.state, store.dispatch, store);
          }
        },
        signal,
        SYNC_INTERVAL,
      );
    },

    update(store, prevState) {
      const pageDidChange = page.pageLifeCycleTransitionedTo(
        ['passive', 'terminated', 'hidden'],
        prevState,
      )(store.state);

      const githubWsNameChanged = ghSliceKey.getValueIfChanged(
        'githubWsName',
        store.state,
        prevState,
      );

      if (pageDidChange || githubWsNameChanged) {
        const { githubWsName } = ghSliceKey.getSliceStateAsserted(store.state);

        if (githubWsName) {
          debug('Running Github sync in background');
          syncWithGithub(
            githubWsName,
            new AbortController().signal,
            localFileEntryManager(),
            false,
          )(store.state, store.dispatch, store);
        }
      }
    },
  };
});

async function isGithubWorkspace(wsName: string) {
  const wsInfo = await workspace.readWorkspaceInfo(wsName, {
    type: GITHUB_STORAGE_PROVIDER_NAME,
  });

  return Boolean(wsInfo);
}
