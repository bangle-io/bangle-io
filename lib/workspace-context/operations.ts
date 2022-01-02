import { Node } from '@bangle.dev/pm';

import {
  BaseFileSystemError,
  NATIVE_BROWSER_PERMISSION_ERROR,
  NATIVE_BROWSER_USER_ABORTED_ERROR,
} from '@bangle.io/baby-fs';
import { ApplicationStore, AppState } from '@bangle.io/create-store';
import { ExtensionRegistry } from '@bangle.io/extension-registry';
import {
  goToLocation,
  historyUpdateOpenedWsPaths,
} from '@bangle.io/page-context';
import {
  HELP_FS_WORKSPACE_NAME,
  WORKSPACE_NOT_FOUND_ERROR,
  WorkspaceError,
} from '@bangle.io/workspaces';
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
import { validateOpenedWsPaths } from './helpers';
import { fileOpsPlus, FileOpsType } from './use-get-file-ops';

const LOG = false;
let log = LOG ? console.log.bind(console, 'workspaceOps') : () => {};

export const getFileOps = () => {
  return (
    state: AppState,
    dispatch: WorkspaceDispatchType,
  ): FileOpsType | undefined => {
    const sliceState = workspaceSliceKey.getSliceState(state);
    return fileOpsPlus((error) => {
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
      name: 'action::workspace-context:set-pending-refresh-ws-paths',
      value: {
        pendingRefreshWsPaths: wsName,
      },
    });

    log('refreshing wsPaths', wsName);

    const fileOps = getFileOps()(state, dispatch);

    fileOps
      ?.listAllFiles(wsName)
      .then((items) => {
        log('received files for wsName', wsName, 'file count', items.length);

        dispatch({
          name: 'action::workspace-context:update-ws-paths',
          value: {
            wsName,
            wsPaths: items,
          },
        });
        dispatch({
          name: 'action::workspace-context:set-pending-refresh-ws-paths',
          value: {
            pendingRefreshWsPaths: undefined,
          },
        });

        return;
      })
      .catch((error) => {
        dispatch({
          name: 'action::workspace-context:update-ws-paths',
          value: {
            wsName,
            wsPaths: undefined,
          },
        });
        dispatch({
          name: 'action::workspace-context:set-pending-refresh-ws-paths',
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
    const fileOps = getFileOps()(state, dispatch);

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

export const getNote = (
  extensionRegistry: ExtensionRegistry,
  wsPath: string,
) => {
  return (state: AppState, dispatch: WorkspaceDispatchType) => {
    const fileOps = getFileOps()(state, dispatch);

    const sliceState = workspaceSliceKey.getSliceState(state);

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
  extensionRegistry: ExtensionRegistry,
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
    const fileOps = getFileOps()(store.state, store.dispatch);
    const sliceState = workspaceSliceKey.getSliceState(store.state);

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

export const deleteNote = (wsPathToDelete: Array<string> | string) => {
  return async (
    _: AppState,
    dispatch: WorkspaceDispatchType,
    store: ApplicationStore,
  ): Promise<boolean> => {
    const fileOps = getFileOps()(store.state, dispatch);
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
      newOpenedWsPaths = newOpenedWsPaths.closeIfFound(w);
    });

    updateOpenedWsPaths(newOpenedWsPaths, { replaceHistory: true })(
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
    const fileOps = getFileOps()(state, dispatch);

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
      return goToWorkspaceAuthRoute(wsName, error.code)(state);
    }
    if (
      error instanceof WorkspaceError &&
      error.code === WORKSPACE_NOT_FOUND_ERROR
    ) {
      return goToWsNameRouteNotFoundRoute(wsName)(state);
    }

    return undefined;
  };
}

// Navigation ops
export const updateLocation = ({
  search,
  pathname,
}: {
  search?: string;
  pathname?: string;
}) => {
  return (state: AppState, dispatch: WorkspaceDispatchType) => {
    // validate
    const wsName = pathnameToWsName(pathname);

    if (!wsName) {
      dispatch({
        name: 'action::workspace-context:update-location',
        value: {
          wsName: undefined,
          openedWsPaths: OpenedWsPaths.createEmpty(),
        },
      });
      return;
    }

    const openedWsPaths = OpenedWsPaths.createFromArray([
      pathnameToWsPath(pathname),
      searchToWsPath(search),
    ]);

    const validOpenedWsPaths = validateOpenedWsPaths(openedWsPaths);

    if (!validOpenedWsPaths.valid) {
      goToInvalidPathRoute(wsName, validOpenedWsPaths.invalidWsPath)(state);
      return;
    }

    dispatch({
      name: 'action::workspace-context:update-location',
      value: {
        wsName: wsName,
        openedWsPaths: openedWsPaths,
      },
    });
  };
};

export const updateOpenedWsPaths = (
  newOpened: OpenedWsPaths | ((arg: OpenedWsPaths) => OpenedWsPaths),
  { replaceHistory = false }: { replaceHistory?: boolean } = {},
) => {
  return (state: AppState, dispatch: WorkspaceDispatchType) => {
    const sliceState = workspaceSliceKey.getSliceState(state);

    if (!sliceState?.wsName) {
      return false;
    }

    const { wsName } = sliceState;

    if (newOpened instanceof Function) {
      newOpened = newOpened(sliceState.openedWsPaths);
    }

    if (newOpened.equal(sliceState.openedWsPaths)) {
      return false;
    }

    const validity = validateOpenedWsPaths(newOpened);

    if (!validity.valid) {
      goToInvalidPathRoute(wsName, validity.invalidWsPath)(state);
      return false;
    }

    historyUpdateOpenedWsPaths(newOpened, wsName, { replace: replaceHistory })(
      state,
    );

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
        historyUpdateOpenedWsPaths(newOpened, wsName, { replace: true })(state);
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
    if (newTab) {
      if (typeof window !== 'undefined') {
        window.open(wsPathToPathname(wsPath));
      }
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

export const goToWorkspaceHomeRoute = () => {
  return (state: AppState) => {
    goToLocation('/')(state);
    return true;
  };
};

export function goToWsNameRoute(
  wsName: string,
  { replace = false }: { replace?: boolean } = {},
) {
  return (state: AppState) => {
    goToLocation(wsNameToPathname(wsName), { replace })(state);
  };
}

export const goToWorkspaceAuthRoute = (wsName: string, errorCode: string) => {
  return (state: AppState): void => {
    return goToLocation(
      `/ws-auth/${encodeURIComponent(wsName)}?code=${errorCode}`,
      {
        replace: true,
      },
    )(state);
  };
};

export const goToInvalidPathRoute = (wsName: string, invalidPath: string) => {
  return (state: AppState): void => {
    return goToLocation(`/ws-invalid-path/${encodeURIComponent(wsName)}`, {
      replace: true,
    })(state);
  };
};

export function goToWsNameRouteNotFoundRoute(wsName: string) {
  return (state: AppState) => {
    goToLocation(`/ws-not-found/${encodeURIComponent(wsName)}`, {
      replace: true,
    })(state);
  };
}
