import { Slice } from '@bangle.io/create-store';
import type { JsonValue } from '@bangle.io/shared-types';
import { assertActionType } from '@bangle.io/utils';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { ActionSerializers } from './action-serializers';
import { WorkspaceSliceAction, workspaceSliceKey } from './common';
import {
  refreshWsPathsEffect,
  saveLastUsedWorkspace,
  saveWorkspaceInfoEffect,
  updateLocationEffect,
} from './effects';
import {
  WorkspaceSliceState,
  WorkspaceStateKeys,
} from './workspace-slice-state';

export const JSON_SCHEMA_VERSION = 'workspace-slice/2';

const LOG = false;
let log = LOG ? console.log.bind(console, 'workspaceSlice') : () => {};

export const workspaceSliceInitialState = new WorkspaceSliceState({
  wsName: undefined,
  openedWsPaths: OpenedWsPaths.createEmpty(),
  recentlyUsedWsPaths: undefined,
  wsPaths: undefined,
  pendingRefreshWsPaths: undefined,
});

const applyState = (
  action: WorkspaceSliceAction,
  state: WorkspaceSliceState,
): WorkspaceSliceState => {
  switch (action.name) {
    case 'action::@bangle.io/workspace-context:sync-page-location': {
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

    case 'action::@bangle.io/workspace-context:update-recently-used-ws-paths': {
      const { wsName, recentlyUsedWsPaths } = action.value;

      if (wsName === state.wsName) {
        return WorkspaceSliceState.update(state, {
          recentlyUsedWsPaths,
        });
      }

      return state;
    }

    case 'action::@bangle.io/workspace-context:update-ws-paths': {
      const { wsName, wsPaths } = action.value;

      if (wsName === state.wsName) {
        return WorkspaceSliceState.update(state, {
          wsPaths,
        });
      }

      return state;
    }

    case 'action::@bangle.io/workspace-context:set-pending-refresh-ws-paths': {
      return WorkspaceSliceState.update(state, {
        pendingRefreshWsPaths: action.value.pendingRefreshWsPaths,
      });
    }

    default: {
      return state;
    }
  }
};

export function workspaceSlice() {
  assertActionType('@bangle.io/workspace-context', {} as WorkspaceSliceAction);

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

        if (action.name.startsWith('action::@bangle.io/workspace-context:')) {
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
          pendingRefreshWsPaths: undefined,
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
          pendingRefreshWsPaths: undefined,
        });
      },
    },
    actions: ActionSerializers,

    sideEffect: [
      updateLocationEffect,
      refreshWsPathsEffect,
      saveWorkspaceInfoEffect,
      saveLastUsedWorkspace,
    ],
  });
}
