import { Node } from '@bangle.dev/pm';

import {
  BaseFileSystemError,
  NATIVE_BROWSER_PERMISSION_ERROR,
  NATIVE_BROWSER_USER_ABORTED_ERROR,
} from '@bangle.io/baby-fs';
import { ApplicationStore, AppState } from '@bangle.io/create-store';
import { extensionRegistrySliceKey } from '@bangle.io/extension-registry';
import {
  getPageLocation,
  goToLocation,
  historyUpdateOpenedWsPaths,
  pageSliceKey,
} from '@bangle.io/slice-page';
import {
  OpenedWsPaths,
  pathnameToWsName,
  pathnameToWsPath,
  PathValidationError,
  searchToWsPath,
  validateNoteWsPath,
  wsNameToPathname,
  wsPathToPathname,
} from '@bangle.io/ws-path';

import { WorkspaceDispatchType, workspaceSliceKey } from './common';
import { defaultDoc } from './default-doc';
import { fileSystemPlus, FileSystemType } from './file-system-plus';
import { HELP_FS_WORKSPACE_NAME } from './help-fs';
import {
  getPrevOpenedWsPathsFromSearch,
  savePrevOpenedWsPathsToSearch,
  validateOpenedWsPaths,
} from './helpers';
import { WORKSPACE_NOT_FOUND_ERROR, WorkspaceError } from './workspaces/errors';

const LOG = false;
let log = LOG ? console.log.bind(console, 'workspaceOps') : () => {};

export const wrapFileMethod = () => {
  return (
    state: AppState,
    dispatch: WorkspaceDispatchType,
  ): FileSystemType | undefined => {
    const sliceState = workspaceSliceKey.getSliceState(state);
    return fileSystemPlus((error) => {
      if (sliceState?.wsName) {
        workspaceHandleError(sliceState.wsName, error)(state, dispatch);
      }
    });
  };
};

export const refreshWsPaths = () => {
  return (state: AppState, dispatch: WorkspaceDispatchType) => {
    const wsName = workspaceSliceKey.getSliceState(state)?.wsName;

    if (!wsName) {
      return false;
    }

    if (
      workspaceSliceKey.getSliceState(state)?.pendingRefreshWsPaths === wsName
    ) {
      return false;
    }

    dispatch({
      name: 'action::@bangle.io/slice-workspace:set-pending-refresh-ws-paths',
      value: {
        pendingRefreshWsPaths: wsName,
      },
    });

    log('refreshing wsPaths', wsName);

    const fileOps = wrapFileMethod()(state, dispatch);

    fileOps
      ?.listAllFiles(wsName)
      .then((items) => {
        log('received files for wsName', wsName, 'file count', items.length);

        dispatch({
          name: 'action::@bangle.io/slice-workspace:update-ws-paths',
          value: {
            wsName,
            wsPaths: items,
          },
        });
        dispatch({
          name: 'action::@bangle.io/slice-workspace:set-pending-refresh-ws-paths',
          value: {
            pendingRefreshWsPaths: undefined,
          },
        });

        return;
      })
      .catch((error) => {
        dispatch({
          name: 'action::@bangle.io/slice-workspace:update-ws-paths',
          value: {
            wsName,
            wsPaths: undefined,
          },
        });
        dispatch({
          name: 'action::@bangle.io/slice-workspace:set-pending-refresh-ws-paths',
          value: {
            pendingRefreshWsPaths: undefined,
          },
        });

        // ignore file system error here as other parts of the
        // application should have handled it
        if (error instanceof BaseFileSystemError) {
        } else if (
          error instanceof WorkspaceError &&
          error.code === WORKSPACE_NOT_FOUND_ERROR
        ) {
        } else {
          throw error;
        }
      });

    return true;
  };
};

export const renameNote = (targetWsPath: string, newWsPath: string) => {
  return (
    state: AppState,
    dispatch: WorkspaceDispatchType,
    store: ApplicationStore,
  ): boolean => {
    const fileOps = wrapFileMethod()(state, dispatch);

    const sliceState = workspaceSliceKey.getSliceState(state);
    const wsName = sliceState?.wsName;

    if (!wsName || !sliceState || !fileOps) {
      return false;
    }

    if (wsName === HELP_FS_WORKSPACE_NAME) {
      throw new PathValidationError('Cannot rename a help document');
    }

    fileOps.renameFile(targetWsPath, newWsPath).then(() => {
      replaceAnyMatchingOpenedWsPath(targetWsPath, newWsPath)(
        store.state,
        store.dispatch,
      );
      refreshWsPaths()(store.state, store.dispatch);
    });

    return true;
  };
};

export const getNote = (wsPath: string) => {
  return (state: AppState, dispatch: WorkspaceDispatchType) => {
    const fileOps = wrapFileMethod()(state, dispatch);

    const sliceState = workspaceSliceKey.getSliceState(state);
    const extensionRegistry =
      extensionRegistrySliceKey.getSliceStateAsserted(state).extensionRegistry;

    if (fileOps && sliceState?.wsName) {
      return fileOps.getDoc(
        wsPath,
        extensionRegistry.specRegistry,
        extensionRegistry.markdownItPlugins,
      );
    }
    return Promise.resolve(undefined);
  };
};

export const createNote = (
  wsPath: string,
  {
    open = true,
    doc,
  }: {
    open?: Boolean;
    doc?: Node;
  } = {},
) => {
  return async (
    _: AppState,
    dispatch: WorkspaceDispatchType,
    store: ApplicationStore,
  ) => {
    const fileOps = wrapFileMethod()(store.state, store.dispatch);
    const sliceState = workspaceSliceKey.getSliceState(store.state);

    const extensionRegistry = extensionRegistrySliceKey.getSliceStateAsserted(
      store.state,
    ).extensionRegistry;

    if (!fileOps || !sliceState?.wsName) {
      return false;
    }

    if (doc == null) {
      doc = defaultDoc(wsPath, extensionRegistry);
    }

    const fileExists = await fileOps.checkFileExists(wsPath);
    if (!fileExists) {
      await fileOps.saveDoc(wsPath, doc, extensionRegistry.specRegistry);
    }

    if (open) {
      updateOpenedWsPaths((openedWsPath) => {
        return openedWsPath.updateByIndex(0, wsPath);
      })(store.state, store.dispatch);
    }

    return refreshWsPaths()(store.state, store.dispatch);
  };
};

export const saveFile = (wsPath: string, file: File) => {
  return async (
    _: AppState,
    dispatch: WorkspaceDispatchType,
    store: ApplicationStore,
  ) => {
    const fileOps = wrapFileMethod()(store.state, store.dispatch);

    await fileOps?.saveFile(wsPath, file);

    return true;
  };
};

export const saveDoc = (wsPath: string, doc: Node) => {
  return async (
    _: AppState,
    dispatch: WorkspaceDispatchType,
    store: ApplicationStore,
  ) => {
    const fileOps = wrapFileMethod()(store.state, store.dispatch);
    const extensionRegistry = extensionRegistrySliceKey.getSliceStateAsserted(
      store.state,
    ).extensionRegistry;

    await fileOps?.saveDoc(wsPath, doc, extensionRegistry.specRegistry);

    return true;
  };
};

export const getFile = (wsPath: string) => {
  return async (
    _: AppState,
    dispatch: WorkspaceDispatchType,
    store: ApplicationStore,
  ) => {
    const fileOps = wrapFileMethod()(store.state, store.dispatch);
    return fileOps?.getFile(wsPath);
  };
};

export const deleteNote = (wsPathToDelete: Array<string> | string) => {
  return async (
    _: AppState,
    dispatch: WorkspaceDispatchType,
    store: ApplicationStore,
  ): Promise<boolean> => {
    const fileOps = wrapFileMethod()(store.state, dispatch);
    const sliceState = workspaceSliceKey.getSliceState(store.state);

    if (!fileOps || !sliceState?.wsName) {
      return false;
    }

    if (sliceState.wsName === HELP_FS_WORKSPACE_NAME) {
      // TODO move this to a notification
      throw new PathValidationError('Cannot delete a help document');
    }

    if (!Array.isArray(wsPathToDelete)) {
      wsPathToDelete = [wsPathToDelete];
    }

    let newOpenedWsPaths = sliceState.openedWsPaths;

    wsPathToDelete.forEach((w) => {
      validateNoteWsPath(w);
      newOpenedWsPaths = newOpenedWsPaths.closeIfFound(w).shrink();
    });

    updateOpenedWsPaths(newOpenedWsPaths, { replace: true })(
      store.state,
      dispatch,
    );

    for (let wsPath of wsPathToDelete) {
      await fileOps.deleteFile(wsPath);
    }

    return refreshWsPaths()(store.state, dispatch);
  };
};

export const checkFileExists = (wsPath: string) => {
  return (
    state: AppState,
    dispatch: WorkspaceDispatchType,
  ): Promise<boolean> => {
    const fileOps = wrapFileMethod()(state, dispatch);

    return fileOps?.checkFileExists(wsPath) || Promise.resolve(false);
  };
};

export function workspaceHandleError(wsName: string, error: Error) {
  return (state: AppState, dispatch: WorkspaceDispatchType) => {
    if (
      error instanceof BaseFileSystemError &&
      (error.code === NATIVE_BROWSER_PERMISSION_ERROR ||
        error.code === NATIVE_BROWSER_USER_ABORTED_ERROR)
    ) {
      return goToWorkspaceAuthRoute(wsName, error.code)(state, dispatch);
    }
    if (
      error instanceof WorkspaceError &&
      error.code === WORKSPACE_NOT_FOUND_ERROR
    ) {
      return goToWsNameRouteNotFoundRoute(wsName)(state, dispatch);
    }

    return undefined;
  };
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
