import { Slice } from '@bangle.io/create-store';
import type { JsonValue } from '@bangle.io/shared-types';
import { assertActionName, BaseError } from '@bangle.io/utils';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { ActionSerializers } from './action-serializers';
import { WorkspaceSliceAction, workspaceSliceKey } from './common';
import {
  refreshWorkspacesEffect,
  refreshWsPathsEffect,
  updateLocationEffect,
} from './effects';
import {
  getStorageErrorHandler,
  workspaceErrorHandler,
} from './file-operations';
import {
  WorkspaceSliceState,
  WorkspaceStateKeys,
} from './workspace-slice-state';
import { mergeWsInfoRegistries } from './workspaces/read-ws-info';

export const JSON_SCHEMA_VERSION = 'workspace-slice/2';

const LOG = false;
let log = LOG ? console.log.bind(console, 'workspaceSlice') : () => {};

export const workspaceSliceInitialState = new WorkspaceSliceState({
  wsName: undefined,
  openedWsPaths: OpenedWsPaths.createEmpty(),
  recentlyUsedWsPaths: undefined,
  wsPaths: undefined,
  refreshCounter: 0,
  workspacesInfo: undefined,
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
        return WorkspaceSliceState.update(newState, {
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

    case 'action::@bangle.io/slice-workspace:refresh-ws-paths': {
      return WorkspaceSliceState.update(state, {
        refreshCounter: state.refreshCounter + 1,
      });
    }

    case 'action::@bangle.io/slice-workspace:set-workspace-infos': {
      const existingWsInfos = state.workspacesInfo || {};

      const newWsInfos = mergeWsInfoRegistries(
        existingWsInfos,
        action.value.workspacesInfo,
      );

      return WorkspaceSliceState.update(state, {
        workspacesInfo: newWsInfos,
      });
    }

    default: {
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

      stateToJSON(val) {
        const obj: { [K in WorkspaceStateKeys]: any } = {
          wsName: val.wsName,
          openedWsPaths: val.openedWsPaths.toArray(),
          recentlyUsedWsPaths: val.recentlyUsedWsPaths,
          wsPaths: val.wsPaths,
          refreshCounter: val.refreshCounter,
          workspacesInfo: val.workspacesInfo,
        };

        const result = Object.fromEntries(
          Object.entries(obj).map(([key, val]): [string, JsonValue] => {
            if (val === undefined) {
              // convert to null since JSON likes it
              return [key, null];
            }
            if (Array.isArray(val)) {
              return [key, val.map((r) => (r == null ? null : r))];
            }
            return [key, val];
          }),
        );

        return {
          version: JSON_SCHEMA_VERSION,
          data: result,
        };
      },

      stateFromJSON(_, value: any) {
        if (!value || value.version !== JSON_SCHEMA_VERSION) {
          return workspaceSliceInitialState;
        }

        const data = value.data;

        return WorkspaceSliceState.update(workspaceSliceInitialState, {
          openedWsPaths: OpenedWsPaths.createFromArray(
            Array.isArray(data.openedWsPaths) ? data.openedWsPaths : [],
          ),
          wsName: data.wsName || undefined,
          recentlyUsedWsPaths: data.recentlyUsedWsPaths || undefined,
          wsPaths: data.wsPaths || undefined,
          refreshCounter: data.refreshCounter || 0,
          workspacesInfo: data.workspacesInfo || undefined,
        });
      },
    },
    actions: ActionSerializers,

    onError: (error, store) => {
      if (error instanceof BaseError) {
        // give priority to workspace error handler
        if (workspaceErrorHandler(error, store) === true) {
          return true;
        }

        const wsName = workspaceSliceKey.getSliceStateAsserted(
          store.state,
        ).wsName;
        // Only handle errors of the current wsName
        // this avoids showing errors of previously opened workspace due to delay
        // in processing.
        if (wsName) {
          // let the storage provider handle error
          const errorHandler = getStorageErrorHandler()(
            store.state,
            store.dispatch,
          );
          if (errorHandler(error, store) === true) {
            return true;
          }
        }

        // TODO have a default operation for baseerrors
      }

      return false;
    },
    sideEffect: [
      updateLocationEffect,
      refreshWsPathsEffect,
      refreshWorkspacesEffect,
    ],
  });
}
