import { createSelector } from 'reselect';

import { ApplicationStore, Slice, SliceKey } from '@bangle.io/create-store';
import type { JsonValue } from '@bangle.io/shared-types';
import { filePathToWsPath, matchPath, OpenedWsPaths } from '@bangle.io/ws-path';

type TAppStore = ApplicationStore<
  WorkspaceContextState,
  WorkspaceContextAction
>;

type AppState = TAppStore['state'];

export type DispatchType = TAppStore['dispatch'];

export type WorkspaceContextAction = {
  name: 'action::workspace-context:update-location';
  value: {
    locationSearchQuery: string | undefined;
    locationPathname: string | undefined;
  };
};

export interface WorkspaceContextState {
  locationPathname?: string;
  locationSearchQuery?: string;
  wsName?: string;
  openedWsPaths: OpenedWsPaths;
}

export const workspaceContextKey = new SliceKey<
  WorkspaceContextState,
  WorkspaceContextAction
>('workspace-context-slice');

export const workspaceContextInitialState: WorkspaceContextState = {
  locationPathname:
    typeof window !== 'undefined' ? window.location.pathname : undefined,
  locationSearchQuery:
    typeof window !== 'undefined' ? window.location.search : undefined,
  wsName: undefined,
  openedWsPaths: OpenedWsPaths.createEmpty(),
};

const applyState = (
  action: WorkspaceContextAction,
  state: WorkspaceContextState,
): WorkspaceContextState => {
  switch (action.name) {
    case 'action::workspace-context:update-location': {
      return {
        ...state,
        locationPathname: action.value.locationPathname,
        locationSearchQuery: action.value.locationSearchQuery,
      };
    }
    default: {
      return state;
    }
  }
};

const selectPathname = (state: WorkspaceContextState) => state.locationPathname;
const selectSearchQuery = (state: WorkspaceContextState) =>
  state.locationSearchQuery;

const selectWsName = createSelector(selectPathname, (pathName) => {
  return getWsNameFromPathname(pathName);
});

const selectOpenedWsPaths = createSelector(
  [selectPathname, selectSearchQuery],
  (pathName, searchQuery) => {
    return OpenedWsPaths.createFromArray([
      getPrimaryWsPath(pathName),
      getSecondaryWsPath(searchQuery),
    ]);
  },
);

export function workspaceContextSlice() {
  return new Slice({
    key: workspaceContextKey,
    state: {
      init() {
        return workspaceContextInitialState;
      },
      apply(action, state) {
        const newState = applyState(action, state);
        if (newState === state) {
          return state;
        }
        // update derived state
        newState.wsName = selectWsName(newState);
        newState.openedWsPaths = selectOpenedWsPaths(newState);

        return newState;
      },

      stateToJSON(val) {
        const result: { [key in keyof typeof val]: JsonValue } = {
          locationPathname: val.locationPathname,
          locationSearchQuery: val.locationSearchQuery,
          openedWsPaths: val.openedWsPaths.toArray().map((r) => (r ? r : null)),
          wsName: val.wsName,
        };

        return result;
      },

      stateFromJSON(_, value: any) {
        const state: WorkspaceContextState = Object.assign(
          {},
          workspaceContextInitialState,
          {},
        );

        if (value.locationPathname) {
          state.locationPathname = value.locationPathname;
        }

        if (value.locationSearchQuery) {
          state.locationSearchQuery = value.locationSearchQuery;
        }

        if (Array.isArray(value.openedWsPaths)) {
          state.openedWsPaths = OpenedWsPaths.createFromArray(
            value.openedWsPaths,
          );
        }

        if (value.wsName) {
          state.wsName = value.wsName;
        }

        return state;
      },
    },
  });
}

function getPrimaryFilePath(pathname?: string) {
  if (pathname) {
    return pathname.split('/').slice(3).join('/');
  }
  return undefined;
}

function getPrimaryWsPath(pathname?: string) {
  const wsName = getWsNameFromPathname(pathname);
  const filePath = getPrimaryFilePath(pathname);
  if (!wsName || !filePath) {
    return undefined;
  }
  return filePathToWsPath(wsName, filePath);
}

function getSecondaryWsPath(search?: string) {
  const searchParams = new URLSearchParams(search);
  const secondaryWsPath = searchParams.get('secondary') ?? undefined;

  return secondaryWsPath;
}

function getWsNameFromPathname(pathname?: string) {
  if (!pathname) {
    return undefined;
  }

  const match = matchPath<{ wsName: string }>(pathname, {
    path: '/ws/:wsName',
    exact: false,
    strict: false,
  });

  const { wsName } = match?.params ?? {};

  return wsName;
}
