import { AppState } from '@bangle.io/create-store';
import {
  getPageLocation,
  goToLocation,
  historyUpdateOpenedWsPaths,
  pageSliceKey,
} from '@bangle.io/slice-page';
import {
  OpenedWsPaths,
  wsNameToPathname,
  wsPathToPathname,
} from '@bangle.io/ws-path';

import { WorkspaceDispatchType, workspaceSliceKey } from './common';
import {
  getPrevOpenedWsPathsFromSearch,
  savePrevOpenedWsPathsToSearch,
  validateOpenedWsPaths,
} from './helpers';

const LOG = false;
let log = LOG ? console.log.bind(console, 'workspaceOps') : () => {};

export const getOpenedWsPaths = () => {
  return workspaceSliceKey.queryOp((state) => {
    return workspaceSliceKey.getSliceStateAsserted(state).openedWsPaths;
  });
};

export const getWsName = () =>
  workspaceSliceKey.queryOp((state): string | undefined => {
    return workspaceSliceKey.getSliceStateAsserted(state).wsName;
  });

export const sliceHasError = () => {
  return workspaceSliceKey.queryOp((state) =>
    Boolean(workspaceSliceKey.getSliceStateAsserted(state).error),
  );
};

// Navigation ops
export const updateOpenedWsPaths = (
  newOpened: OpenedWsPaths | ((arg: OpenedWsPaths) => OpenedWsPaths),
  opts?: Parameters<typeof historyUpdateOpenedWsPaths>[2],
) => {
  return (state: AppState, dispatch: WorkspaceDispatchType) => {
    const sliceState = workspaceSliceKey.getSliceState(state);

    if (!sliceState) {
      return false;
    }

    if (newOpened instanceof Function) {
      newOpened = newOpened(sliceState.openedWsPaths);
    }

    if (newOpened.equal(sliceState.openedWsPaths)) {
      return false;
    }

    const validity = validateOpenedWsPaths(newOpened);

    if (!validity.valid) {
      goToInvalidPathRoute(
        sliceState.wsName || 'unknown-ws',
        validity.invalidWsPath,
      )(state, dispatch);

      return false;
    }

    // get wsName from newOpened so as to cover if we opened a new wName than what is in the state.
    const wsName = newOpened.getWsNames()[0];

    if (!wsName) {
      if (sliceState.wsName) {
        goToWsNameRoute(sliceState.wsName, opts)(state, dispatch);

        return true;
      }

      goToWorkspaceHomeRoute(opts)(state, dispatch);

      return true;
    }

    if (!newOpened.allBelongToSameWsName(wsName)) {
      console.error('Cannot have different wsNames');
      goToInvalidPathRoute(wsName)(state, dispatch);

      return false;
    }

    historyUpdateOpenedWsPaths(
      newOpened,
      wsName,
      opts,
    )(state, pageSliceKey.getDispatch(dispatch));

    return true;
  };
};

// replaces a targetWsPath with `newWsPath` if found in one of the wsPaths
// in openedWsPaths
export const replaceAnyMatchingOpenedWsPath = (
  targetWsPath: string,
  newWsPath: string,
) => {
  return (state: AppState, dispatch: WorkspaceDispatchType): boolean => {
    const sliceState = workspaceSliceKey.getSliceState(state);

    if (!sliceState) {
      return false;
    }

    const { openedWsPaths, wsName } = sliceState;

    if (wsName) {
      const newOpened = openedWsPaths.updateIfFound(targetWsPath, newWsPath);

      if (!newOpened.equal(openedWsPaths)) {
        historyUpdateOpenedWsPaths(newOpened, wsName, { replace: true })(
          state,
          pageSliceKey.getDispatch(dispatch),
        );

        return true;
      }
    }

    return false;
  };
};

export const pushWsPath = (
  wsPath: string,
  newTab = false,
  secondary = false,
) => {
  return (state: AppState, dispatch: WorkspaceDispatchType) => {
    if (newTab && typeof window !== 'undefined') {
      window.open(wsPathToPathname(wsPath));

      return true;
    }

    return updateOpenedWsPaths((openedWsPath) => {
      if (secondary) {
        return openedWsPath.updateByIndex(1, wsPath);
      }

      return openedWsPath.updateByIndex(0, wsPath);
    })(state, dispatch);
  };
};

export const goToWorkspaceHomeRoute = ({
  replace = false,
}: { replace?: boolean } = {}) => {
  return (state: AppState, dispatch: WorkspaceDispatchType) => {
    goToLocation('/', { replace })(state, pageSliceKey.getDispatch(dispatch));

    return;
  };
};

export function goToWsNameRoute(
  wsName: string,
  {
    newTab = false,
    replace = false,
    // If false will not open previously opened editors that are saved in the URL search params
    reopenPreviousEditors = true,
  }: {
    newTab?: boolean;
    replace?: boolean;
    reopenPreviousEditors?: boolean;
  } = {},
) {
  return (state: AppState, dispatch: WorkspaceDispatchType) => {
    if (newTab && typeof window !== 'undefined') {
      window.open(wsNameToPathname(wsName));

      return;
    }

    if (reopenPreviousEditors) {
      const location = getPageLocation()(state);
      const openedWsPaths = getPrevOpenedWsPathsFromSearch(location?.search);

      if (openedWsPaths?.allBelongToSameWsName(wsName)) {
        updateOpenedWsPaths(openedWsPaths, { replace: replace })(
          state,
          dispatch,
        );

        return;
      }
    }

    goToLocation(wsNameToPathname(wsName), { replace })(
      state,
      pageSliceKey.getDispatch(dispatch),
    );
  };
}

export const goToWorkspaceAuthRoute = (wsName: string, errorCode: string) => {
  return (state: AppState, dispatch: WorkspaceDispatchType): void => {
    const sliceState = workspaceSliceKey.getSliceState(state);

    const search = new URLSearchParams([['error_code', errorCode]]);

    const openedWsPaths = sliceState?.openedWsPaths;

    if (openedWsPaths) {
      savePrevOpenedWsPathsToSearch(openedWsPaths, search);
    }

    return goToLocation(
      `/ws-auth/${encodeURIComponent(wsName)}?${search.toString()}`,
      {
        replace: true,
      },
    )(state, pageSliceKey.getDispatch(dispatch));
  };
};

export const goToInvalidPathRoute = (wsName: string, invalidPath?: string) => {
  return (state: AppState, dispatch: WorkspaceDispatchType): void => {
    return goToLocation(`/ws-invalid-path/${encodeURIComponent(wsName)}`, {
      replace: true,
    })(state, pageSliceKey.getDispatch(dispatch));
  };
};

export function goToWsNameRouteNotFoundRoute(wsName: string) {
  return (state: AppState, dispatch: WorkspaceDispatchType) => {
    goToLocation(`/ws-not-found/${encodeURIComponent(wsName)}`, {
      replace: true,
    })(state, pageSliceKey.getDispatch(dispatch));
  };
}
