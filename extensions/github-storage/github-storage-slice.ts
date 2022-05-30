import { page, Slice, workspace } from '@bangle.io/api';

import { ghSliceKey } from './common';
import { handleError } from './error-handling';
import { localFileEntryManager } from './file-entry-manager';
import { syncWithGithub } from './operations';

const LOG = true;
const debug = LOG
  ? console.debug.bind(console, 'github-storage-slice')
  : () => {};

const SYNC_INTERVAL = 1000 * 60;

export function githubStorageSlice() {
  return new Slice({
    key: ghSliceKey,
    state: {
      init() {
        return {
          syncState: false,
        };
      },
      apply(action, state) {
        switch (action.name) {
          case 'action::@bangle.io/github-storage:UPDATE_SYNC_STATE': {
            return {
              ...state,
              syncState: action.value.syncState,
            };
          }
          default: {
            return state;
          }
        }
      },
    },
    sideEffect() {
      let interval: ReturnType<typeof setInterval> | undefined;

      return {
        deferredOnce(store) {
          interval = setInterval(() => {
            const wsName = workspace.getWsName()(
              workspace.workspaceSliceKey.getState(store.state),
            );

            if (wsName) {
              debug('Period Github sync in background');
              syncWithGithub(
                wsName,
                new AbortController().signal,
                localFileEntryManager,
                false,
              )(store.state, store.dispatch, store);
            }
          }, SYNC_INTERVAL);
        },
        destroy() {
          if (interval) {
            clearInterval(interval);
          }
        },
        update(store, prevState) {
          const didChange = page.pageLifeCycleTransitionedTo(
            ['passive', 'terminated', 'hidden'],
            prevState,
          )(store.state);

          if (didChange) {
            const wsName = workspace.getWsName()(
              workspace.workspaceSliceKey.getState(store.state),
            );

            if (wsName) {
              debug('Running Github sync in background');
              syncWithGithub(
                wsName,
                new AbortController().signal,
                localFileEntryManager,
                false,
              )(store.state, store.dispatch, store);
            }
          }
        },
      };
    },
    onError: (error: any, store) => {
      return handleError(error, store);
    },
  });
}
