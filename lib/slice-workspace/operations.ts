import { MAX_OPEN_EDITORS, MINI_EDITOR_INDEX } from '@bangle.io/constants';
import type { AppState } from '@bangle.io/create-store';
import {
  getPageLocation,
  goToLocation,
  historyUpdateOpenedWsPaths,
  pageSliceKey,
  wsNameToPathname,
  wsPathToPathname,
} from '@bangle.io/slice-page';
import type { OpenedWsPaths } from '@bangle.io/ws-path';

import type { WorkspaceDispatchType } from './common';
import { workspaceSliceKey } from './common';
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

export function closeMiniEditor() {
  return workspaceSliceKey.op((state, dispatch) => {
    return closeOpenedEditor(MINI_EDITOR_INDEX)(state, dispatch);
  });
}

// removes the wsPath at index from the currently opened wsPaths
// if no param is passed closes primary and secondary editor.
export function closeOpenedEditor(index?: number) {
  return workspaceSliceKey.op((state, dispatch) => {
    if (typeof index === 'number') {
      if (index >= MAX_OPEN_EDITORS) {
        return false;
      }
      updateOpenedWsPaths((openedWsPaths) =>
        openedWsPaths.updateByIndex(index, undefined).optimizeSpace(),
      )(state, dispatch);
    } else {
      updateOpenedWsPaths((openedWsPaths) => openedWsPaths.closeAll())(
        state,
        dispatch,
      );
    }

    return true;
  });
}

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

    // If primary or secondary are changing let the update happen via the  history
    // so that we can record the changes in browser history. Any other wsPaths in
    // openedWsPaths donot need to be recorded in history, so update them directly.
    // TODO: This is a bit confusing
    if (
      sliceState.openedWsPaths.primaryWsPath !== newOpened.primaryWsPath ||
      sliceState.openedWsPaths.secondaryWsPath !== newOpened.secondaryWsPath
    ) {
      historyUpdateOpenedWsPaths(
        newOpened,
        wsName,
        opts,
      )(state, pageSliceKey.getDispatch(dispatch));
    } else {
      dispatch({
        name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
        value: {
          wsName: wsName,
          openedWsPaths: newOpened,
        },
      });
    }

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
        return openedWsPath.updateSecondaryWsPath(wsPath);
      }

      return openedWsPath.updatePrimaryWsPath(wsPath);
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
