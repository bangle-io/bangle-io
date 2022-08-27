import { Slice } from '@bangle.io/create-store';
import type { JsonValue } from '@bangle.io/shared-types';
import { assertActionName } from '@bangle.io/utils';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { ActionSerializers } from './action-serializers';
import type { WorkspaceSliceAction } from './common';
import { workspaceSliceKey } from './common';
import {
  cachedWorkspaceInfoEffect,
  errorHandlerEffect,
  refreshWsPathsEffect,
  updateLocationEffect,
  workspaceNotFoundCheckEffect,
} from './effects';
import { WorkspaceError } from './errors';
import { sliceHasError } from './operations';
import { storageProviderHelpers } from './storage-provider-helpers';
import { WorkspaceSliceState } from './workspace-slice-state';

export const JSON_SCHEMA_VERSION = 'workspace-slice/2';

const LOG = false;
let log = LOG ? console.log.bind(console, 'workspaceSlice') : () => {};

export const workspaceSliceInitialState = new WorkspaceSliceState({
  wsName: undefined,
  openedWsPaths: OpenedWsPaths.createEmpty(),
  recentlyUsedWsPaths: undefined,
  cachedWorkspaceInfo: undefined,
  wsPaths: undefined,
  refreshCounter: 0,
  error: undefined,
});

const applyState = (
  action: WorkspaceSliceAction,
  state: WorkspaceSliceState,
): WorkspaceSliceState => {
  // ignore any action if an error exists unless it sets the error
  if (
    state.error &&
    action.name.startsWith('action::@bangle.io/slice-workspace:') &&
    action.name !== 'action::@bangle.io/slice-workspace:set-error'
  ) {
    console.log(
      `slice-workspace: cannot apply action "${action.name}", error "${state.error.message}" exists.`,
    );

    return state;
  }

  switch (action.name) {
    case 'action::@bangle.io/slice-workspace:set-opened-workspace': {
      const newState = WorkspaceSliceState.update(state, {
        wsName: action.value.wsName,
        openedWsPaths: action.value.openedWsPaths,
      });

      if (newState.wsName !== state.wsName) {
        return WorkspaceSliceState.update(newState, {
          refreshCounter: newState.refreshCounter + 1,
          wsPaths: undefined,
          recentlyUsedWsPaths: undefined,
        });
      }

      if (
        newState.wsName &&
        newState.wsName === state.wsName &&
        newState.openedWsPaths.equal(state.openedWsPaths)
      ) {
        return state;
      }

      return newState;
    }

    case 'action::@bangle.io/slice-workspace:update-recently-used-ws-paths': {
      const { wsName, recentlyUsedWsPaths } = action.value;

      if (wsName === state.wsName) {
        return WorkspaceSliceState.update(state, {
          recentlyUsedWsPaths,
        });
      }

      return state;
    }

    case 'action::@bangle.io/slice-workspace:update-ws-paths': {
      const { wsName, wsPaths } = action.value;

      if (wsName === state.wsName) {
        return WorkspaceSliceState.update(state, {
          wsPaths,
        });
      }

      return state;
    }

    case 'action::@bangle.io/slice-workspace:set-error': {
      const { error } = action.value;

      return WorkspaceSliceState.update(state, {
        error,
      });
    }

    case 'action::@bangle.io/slice-workspace:refresh-ws-paths': {
      return WorkspaceSliceState.update(state, {
        refreshCounter: state.refreshCounter + 1,
      });
    }

    case 'action::@bangle.io/slice-workspace:set-cached-workspace-info': {
      const { workspaceInfo } = action.value;

      return WorkspaceSliceState.update(state, {
        cachedWorkspaceInfo: workspaceInfo,
      });
    }

    default: {
      // hack to catch switch slipping
      let val: never = action;

      return state;
    }
  }
};

export function workspaceSlice() {
  assertActionName('@bangle.io/slice-workspace', workspaceSliceKey);

  return new Slice({
    key: workspaceSliceKey,
    state: {
      init() {
        return workspaceSliceInitialState;
      },

      apply(action, state) {
        const newState = applyState(action, state);

        if (newState === state) {
          return state;
        }

        if (action.name.startsWith('action::@bangle.io/slice-workspace:')) {
          log(action, newState);
        }

        return newState;
      },
    },
    actions: ActionSerializers,

    onError: (error, store) => {
      if (
        error instanceof WorkspaceError ||
        storageProviderHelpers.isStorageProviderError(error)
      ) {
        // Donot handle new errors if there is already an error
        if (sliceHasError()(store.state)) {
          console.log(
            `ignoring error ${error.message} as an error already exists.`,
          );

          return false;
        }

        store.dispatch({
          name: 'action::@bangle.io/slice-workspace:set-error',
          value: {
            error,
          },
        });

        return true;
      }

      return false;
    },
    sideEffect: [
      errorHandlerEffect,
      updateLocationEffect,
      refreshWsPathsEffect,
      workspaceNotFoundCheckEffect,
      cachedWorkspaceInfoEffect,
    ],
  });
}
