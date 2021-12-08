import { createSelector } from 'reselect';

import { Dispatch, useStore } from '@bangle.io/create-store';
import { shallowOrderedArrayCompare } from '@bangle.io/utils';
import {
  getPrimaryWsPath,
  getSecondaryWsPath,
  getWsNameFromPathname,
  isValidNoteWsPath,
  Location,
  OpenedWsPaths,
} from '@bangle.io/ws-path';

export interface WorkspaceStore {
  recentlyUsedWsPaths: string[];
  wsPaths: string[] | undefined;
}

const LOG = false;

let log = LOG ? console.log.bind(console, 'WorkspaceStore') : () => {};

export type WorkspaceDispatch = Dispatch<WorkspaceAction>;

const initialState: WorkspaceStore = {
  recentlyUsedWsPaths: [],
  wsPaths: undefined,
};

type WorkspaceAction =
  | { type: '@UPDATE_RECENTLY_USED_WS_PATHS'; value: string[] }
  | { type: '@UPDATE_WS_PATHS'; value?: string[] };

function smartUpdate<S, K extends keyof S>(state: S, key: K, value: S[K]): S {
  const existingValue = state[key];
  if (value === existingValue) {
    return state;
  }

  if (Array.isArray(value) && Array.isArray(existingValue)) {
    const isEqual = shallowOrderedArrayCompare(value, existingValue);
    if (isEqual) {
      return state;
    }
  }

  return {
    ...state,
    [key]: value,
  };
}

function workspaceReducer(
  state: WorkspaceStore,
  action: WorkspaceAction,
): WorkspaceStore {
  log(action);
  switch (action.type) {
    case '@UPDATE_WS_PATHS': {
      return smartUpdate(state, 'wsPaths', action.value);
    }
    case '@UPDATE_RECENTLY_USED_WS_PATHS': {
      return smartUpdate(state, 'recentlyUsedWsPaths', action.value);
    }

    default: {
      // hack to catch slipping
      let val: never = action;
      throw new Error(`Unrecognized action "${(val as any).type}"`);
    }
  }
}

export function useWorkspaceStore() {
  return useStore(workspaceReducer, initialState);
}

export const Selectors = {
  wsName: createSelector(
    (location: Location) => location.pathname,
    (pathname) => {
      return getWsNameFromPathname(pathname);
    },
  ),
  // TODO move away from history's location to our own location
  openedWsPaths: (location: Location) =>
    new OpenedWsPaths([
      getPrimaryWsPath(location),
      getSecondaryWsPath(location),
    ]),

  noteWsPaths: createSelector(
    (state: WorkspaceStore) => state.wsPaths,
    (wsPaths) => {
      return wsPaths?.filter((wsPath) => isValidNoteWsPath(wsPath));
    },
  ),
};
