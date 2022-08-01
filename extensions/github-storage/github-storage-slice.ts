import { page, Slice, workspace } from '@bangle.io/api';
import { abortableSetInterval } from '@bangle.io/utils';

import { ghSliceKey } from './common';
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
      return {
        deferredOnce(store, signal) {
          abortableSetInterval(
            () => {
              const wsName = workspace.getWsName()(
                workspace.workspaceSliceKey.getState(store.state),
              );

              const pageLifecycle = page.getCurrentPageLifeCycle()(store.state);

              if (wsName && pageLifecycle === 'active') {
                debug('Period Github sync in background');
                // TODO if there were merge conflicts, this will become very noisy
                syncWithGithub(
                  wsName,
                  new AbortController().signal,
                  localFileEntryManager,
                  false,
                )(store.state, store.dispatch, store);
              }
            },
            signal,
            SYNC_INTERVAL,
          );
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
