import { notification, page, Slice, workspace } from '@bangle.io/api';
import { Severity } from '@bangle.io/constants';
import { abortableSetInterval } from '@bangle.io/utils';

import {
  getSyncInterval,
  ghSliceKey,
  GITHUB_STORAGE_PROVIDER_NAME,
  OPERATION_SHOW_CONFLICT_DIALOG,
} from './common';
import { handleError } from './error-handling';
import { checkForConflicts, syncRunner } from './operations';

const LOG = true;
const debug = LOG
  ? console.debug.bind(console, 'github-storage-slice')
  : () => {};

const defaultState = {
  isSyncing: false,
  githubWsName: undefined,
  conflictedWsPaths: [],
};

export function githubStorageSlice() {
  return new Slice({
    key: ghSliceKey,
    state: {
      init() {
        return defaultState;
      },
      apply(action, state) {
        switch (action.name) {
          case 'action::@bangle.io/github-storage:SET_CONFLICTED_WS_PATHS': {
            return {
              ...state,
              conflictedWsPaths: action.value.conflictedWsPaths,
            };
          }

          case 'action::@bangle.io/github-storage:UPDATE_SYNC_STATE': {
            const existingSyncState = state.isSyncing;

            if (existingSyncState === action.value.isSyncing) {
              return state;
            }

            return {
              ...state,
              isSyncing: action.value.isSyncing,
            };
          }
          case 'action::@bangle.io/github-storage:UPDATE_GITHUB_WS_NAME': {
            const existingData = state.githubWsName;

            if (existingData === action.value.githubWsName) {
              return state;
            }

            return {
              ...defaultState,
              githubWsName: action.value.githubWsName,
            };
          }

          case 'action::@bangle.io/github-storage:RESET_GITHUB_STATE': {
            return defaultState;
          }

          default: {
            let x: never = action;

            return state;
          }
        }
      },
    },
    sideEffect: [
      ghWorkspaceEffect,
      syncEffect,
      conflictEffect,
      setConflictNotification,
    ],
    onError: (error: any, store) => {
      return handleError(error, store);
    },
  });
}

export const ghWorkspaceEffect = ghSliceKey.effect(() => {
  return {
    async deferredUpdate(store, prevState) {
      const wsName = workspace.workspaceSliceKey.getValueIfChanged(
        'wsName',
        store.state,
        prevState,
      );

      if (wsName) {
        const isGhWorkspace = Boolean(
          await workspace.readWorkspaceInfo(wsName, {
            type: GITHUB_STORAGE_PROVIDER_NAME,
          }),
        );

        const currentWsName = workspace.workspaceSliceKey.callQueryOp(
          store.state,
          workspace.getWsName(),
        );

        const { githubWsName } = ghSliceKey.getSliceStateAsserted(store.state);

        if (currentWsName === wsName && githubWsName !== wsName) {
          if (isGhWorkspace) {
            store.dispatch({
              name: 'action::@bangle.io/github-storage:UPDATE_GITHUB_WS_NAME',
              value: {
                githubWsName: wsName,
              },
            });
          }
          // reset the state as the workspace is not a github workspace
          else {
            store.dispatch({
              name: 'action::@bangle.io/github-storage:RESET_GITHUB_STATE',
              value: {},
            });
          }
        }
      }
    },
  };
});

export const syncEffect = ghSliceKey.effect(() => {
  return {
    deferredOnce(store, signal) {
      abortableSetInterval(
        () => {
          const { githubWsName } = ghSliceKey.getSliceStateAsserted(
            store.state,
          );

          const pageLifecycle = page.getCurrentPageLifeCycle()(store.state);

          if (githubWsName && pageLifecycle === 'active') {
            debug('Periodic Github sync in background');
            syncRunner(githubWsName, signal)(
              store.state,
              store.dispatch,
              store,
            );
          }
        },
        signal,
        getSyncInterval(),
      );
    },

    update(store, prevState) {
      const pageDidChange = page.pageLifeCycleTransitionedTo(
        ['passive', 'terminated', 'hidden'],
        prevState,
      )(store.state);

      const githubWsNameChanged = ghSliceKey.valueChanged(
        'githubWsName',
        store.state,
        prevState,
      );

      if (pageDidChange || githubWsNameChanged) {
        const { githubWsName } = ghSliceKey.getSliceStateAsserted(store.state);

        if (githubWsName) {
          console.info('Running Github sync in background');
          syncRunner(githubWsName, new AbortController().signal)(
            store.state,
            store.dispatch,
            store,
          );
        }
      }
    },
  };
});

export const conflictEffect = ghSliceKey.effect(() => {
  return {
    deferredOnce(store, signal) {
      abortableSetInterval(
        () => {
          const { githubWsName } = ghSliceKey.getSliceStateAsserted(
            store.state,
          );

          const pageLifecycle = page.getCurrentPageLifeCycle()(store.state);

          if (githubWsName && pageLifecycle === 'active') {
            debug('Periodic Github conflict check in background');
            checkForConflicts(githubWsName)(store.state, store.dispatch, store);
          }
        },
        signal,
        getSyncInterval(),
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

      const { githubWsName } = ghSliceKey.getSliceStateAsserted(store.state);

      if (pageDidChange || githubWsNameChanged) {
        if (githubWsName) {
          checkForConflicts(githubWsName)(store.state, store.dispatch, store);
        }
      }
    },
  };
});

// keeps the conflict notification in sync with the conflictedWsPaths
export const setConflictNotification = ghSliceKey.effect(() => {
  const wsPathToUidMap = new Map<string, string>();

  return {
    destroy() {
      wsPathToUidMap.clear();
    },
    deferredUpdate(store, prevState) {
      const conflictedWsPaths = ghSliceKey.getValueIfChanged(
        'conflictedWsPaths',
        store.state,
        prevState,
      );

      if (conflictedWsPaths) {
        for (const wsPath of conflictedWsPaths) {
          const uid = notification.notificationSliceKey.callOp(
            store.state,
            store.dispatch,
            notification.setEditorIssue({
              description: `There is a conflict with ${wsPath} on Github. Please resolve the conflict on Github and then click on the sync button to resolve the conflict.`,
              title: 'Encountered Conflict',
              severity: Severity.WARNING,
              wsPath,
              serialOperation: OPERATION_SHOW_CONFLICT_DIALOG,
            }),
          );

          wsPathToUidMap.set(wsPath, uid);
        }

        // clear out the notifications for the paths that are no longer conflicted
        for (const [wsPath, uid] of wsPathToUidMap) {
          if (!conflictedWsPaths.includes(wsPath)) {
            notification.notificationSliceKey.callOp(
              store.state,
              store.dispatch,
              notification.clearEditorIssue(uid),
            );
            wsPathToUidMap.delete(wsPath);
          }
        }
      }
    },
  };
});
