import { Slice } from '@bangle.io/create-store';
import { assertActionName } from '@bangle.io/utils';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { ActionSerializers } from './action-serializers';
import type { WorkspaceSliceAction } from './common';
import { workspaceSliceKey } from './common';
import {
  cachedWorkspaceInfoEffect,
  refreshWsPathsEffect,
  updateLocationEffect,
  workspaceNotFoundCheckEffect,
} from './effects';
import { WorkspaceSliceState } from './workspace-slice-state';
import { handleWorkspaceError } from './workspaces-operations';

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
  storageProviderErrors: [],
});

const applyState = (
  action: WorkspaceSliceAction,
  state: WorkspaceSliceState,
): WorkspaceSliceState => {
  switch (action.name) {
    case 'action::@bangle.io/slice-workspace:set-opened-workspace': {
      const newState = WorkspaceSliceState.update(state, {
        wsName: action.value.wsName,
        openedWsPaths: action.value.openedWsPaths,
      });

      if (newState.wsName !== state.wsName) {
        // reset state dependent on wsName
        return WorkspaceSliceState.update(newState, {
          refreshCounter: newState.refreshCounter + 1,
          wsPaths: undefined,
          recentlyUsedWsPaths: undefined,
          cachedWorkspaceInfo: undefined,
          storageProviderErrors: [],
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

    case 'action::@bangle.io/slice-workspace:set-storage-provider-error': {
      if (action.value.wsName !== state.wsName) {
        return state;
      }

      return WorkspaceSliceState.update(state, {
        storageProviderErrors: [
          { ...action.value },
          ...state.storageProviderErrors,
        ]
          // only keep few entries
          .slice(0, 5),
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

      apply(action, sliceState, appState) {
        const newState = applyState(action, sliceState);

        if (newState === sliceState) {
          return sliceState;
        }

        if (action.name.startsWith('action::@bangle.io/slice-workspace:')) {
          log(action, newState);
        }

        return newState;
      },
    },
    actions: ActionSerializers,
    onError: (error, store) => {
      return handleWorkspaceError(error)(store.state, store.dispatch);
    },
    sideEffect: [
      updateLocationEffect,
      refreshWsPathsEffect,
      workspaceNotFoundCheckEffect,
      cachedWorkspaceInfoEffect,
    ],
  });
}
