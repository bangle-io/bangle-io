import { Slice } from '@bangle.io/create-store';
import type { JsonValue } from '@bangle.io/shared-types';

import { WorkspaceSliceAction, workspaceSliceKey } from './common';
import { refreshWsPathsEffect, validateLocationEffect } from './effects';
import { WorkspaceSliceState, WorkspaceStateKeys } from './slice-state';

export const JSON_SCHEMA_VERSION = 'workspace-slice/1';

const LOG = false;
let log = LOG ? console.log.bind(console, 'workspaceSlice') : () => {};

export const workspaceSliceInitialState = new WorkspaceSliceState({
  locationPathname: undefined,
  locationSearchQuery: undefined,
  recentlyUsedWsPaths: undefined,
  wsPaths: undefined,
});

const applyState = (
  action: WorkspaceSliceAction,
  state: WorkspaceSliceState,
): WorkspaceSliceState => {
  switch (action.name) {
    case 'action::workspace-context:update-location': {
      const newState = WorkspaceSliceState.update(state, {
        locationPathname: action.value.locationPathname,
        locationSearchQuery: action.value.locationSearchQuery,
      });

      if (newState.wsName !== state.wsName) {
        return WorkspaceSliceState.update(newState, {
          wsPaths: undefined,
          recentlyUsedWsPaths: undefined,
        });
      }
      return newState;
    }

    case 'action::workspace-context:update-recently-used-ws-paths': {
      const { wsName, recentlyUsedWsPaths } = action.value;

      if (wsName === state.wsName) {
        return WorkspaceSliceState.update(state, {
          recentlyUsedWsPaths,
        });
      }

      return state;
    }

    case 'action::workspace-context:update-ws-paths': {
      const { wsName, wsPaths } = action.value;

      if (wsName === state.wsName) {
        return WorkspaceSliceState.update(state, {
          wsPaths,
        });
      }

      return state;
    }

    default: {
      return state;
    }
  }
};

export function workspaceSlice() {
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

        if (action.name.startsWith('action::workspace-context:')) {
          log(action, newState);
        }

        return newState;
      },

      stateToJSON(val) {
        const obj: { [K in WorkspaceStateKeys]: any } = {
          locationPathname: val.locationPathname,
          locationSearchQuery: val.locationSearchQuery,
          recentlyUsedWsPaths: val.recentlyUsedWsPaths,
          wsPaths: val.wsPaths,
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
          locationPathname: data.locationPathname,
          locationSearchQuery: data.locationSearchQuery,
          recentlyUsedWsPaths: data.recentlyUsedWsPaths,
          wsPaths: data.wsPaths,
        });
      },
    },
    sideEffect: [refreshWsPathsEffect, validateLocationEffect],
  });
}
