import { Slice } from '@bangle.io/create-store';
import type { JsonValue } from '@bangle.io/shared-types';
import {
  HELP_FS_INDEX_FILE_NAME,
  HELP_FS_WORKSPACE_NAME,
} from '@bangle.io/workspaces';
import { filePathToWsPath, isValidFileWsPath } from '@bangle.io/ws-path';

import { WorkspaceSliceAction, workspaceSliceKey } from './common';
import { historyOnInvalidPath, refreshWsPaths } from './operations';
import {
  UpdateState,
  WorkspaceSliceState,
  WorkspaceSliceStateConstructor,
  WorkspaceStateKeys,
} from './slice-state';

export const JSON_SCHEMA_VERSION = 'workspace-slice/1';

const LOG = false;
let log = LOG ? console.log.bind(console, 'workspaceSlice') : () => {};

const initialPathName =
  typeof window !== 'undefined' ? window.location.pathname : undefined;
const initialQuery =
  typeof window !== 'undefined' ? window.location.search : undefined;

export const workspaceSliceInitialState: WorkspaceSliceState =
  new WorkspaceSliceStateConstructor({
    locationPathname: initialPathName,
    locationSearchQuery: initialQuery,
    recentlyUsedWsPaths: undefined,
    wsPaths: undefined,
  });

const applyState = (
  action: WorkspaceSliceAction,
  state: WorkspaceSliceState,
): WorkspaceSliceState => {
  switch (action.name) {
    case 'action::workspace-context:update-location': {
      return state[UpdateState]({
        locationPathname: action.value.locationPathname,
        locationSearchQuery: action.value.locationSearchQuery,
      });
    }

    case 'action::workspace-context:update-recently-used-ws-paths': {
      const { wsName, recentlyUsedWsPaths } = action.value;

      if (wsName === state.wsName) {
        return state[UpdateState]({
          recentlyUsedWsPaths,
        });
      }

      return state;
    }

    case 'action::workspace-context:update-ws-paths': {
      const { wsName, wsPaths } = action.value;

      if (wsName === state.wsName) {
        return state[UpdateState]({
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
          log(action, newState.openedWsPaths.primaryWsPath);
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

        return workspaceSliceInitialState[UpdateState]({
          locationPathname: data.locationPathname,
          locationSearchQuery: data.locationSearchQuery,
          recentlyUsedWsPaths: data.recentlyUsedWsPaths,
          wsPaths: data.wsPaths,
        });
      },
    },
    sideEffect() {
      let loadWsPathsOnMount = true;
      return {
        deferredUpdate(store) {
          if (
            loadWsPathsOnMount &&
            workspaceSliceKey.getSliceState(store.state)?.wsPaths == null
          ) {
            loadWsPathsOnMount = false;
            refreshWsPaths()(store.state, store.dispatch);
          }
        },
        update(store, __, sliceState, prevSliceState) {
          // update wsPaths on workspace change
          if (sliceState.wsName !== prevSliceState.wsName) {
            refreshWsPaths()(store.state, store.dispatch);
          }

          const { wsName, openedWsPaths } = sliceState;

          if (!openedWsPaths.equal(prevSliceState.openedWsPaths)) {
            // TODO fix this weird ness of openedWsPaths not reflecting the true state
            let { primaryWsPath, secondaryWsPath } = openedWsPaths;
            if (wsName === HELP_FS_WORKSPACE_NAME && !primaryWsPath) {
              primaryWsPath = filePathToWsPath(wsName, HELP_FS_INDEX_FILE_NAME);
            }
            if (wsName && primaryWsPath && !isValidFileWsPath(primaryWsPath)) {
              historyOnInvalidPath(wsName, primaryWsPath)(
                store.state,
                store.dispatch,
              );
            } else if (
              wsName &&
              secondaryWsPath &&
              !isValidFileWsPath(secondaryWsPath)
            ) {
              historyOnInvalidPath(wsName, secondaryWsPath)(
                store.state,
                store.dispatch,
              );
            }
            // END_WEIRDNESS
          }
        },
      };
    },
  });
}
