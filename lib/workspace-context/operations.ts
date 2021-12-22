import { Node } from '@bangle.dev/pm';

import { BaseFileSystemError } from '@bangle.io/baby-fs';
import { ApplicationStore, AppState } from '@bangle.io/create-store';
import { ExtensionRegistry } from '@bangle.io/extension-registry';
import type { HistoryAction } from '@bangle.io/shared-types';
import {
  HELP_FS_WORKSPACE_NAME,
  WORKSPACE_NOT_FOUND_ERROR,
  WorkspaceError,
} from '@bangle.io/workspaces';
import {
  OpenedWsPaths,
  PathValidationError,
  resolvePath,
  validateNoteWsPath,
} from '@bangle.io/ws-path';

import {
  WorkspaceDispatchType,
  WorkspaceSliceAction,
  workspaceSliceKey,
} from './common';
import { defaultDoc } from './default-doc';
import { validateOpenedWsPaths } from './helpers';
import type { WorkspaceSliceState } from './slice-state';
import { fileOpsPlus, FileOpsType } from './use-get-file-ops';

const LOG = false;
let log = LOG ? console.log.bind(console, 'workspaceOps') : () => {};

export function updateLocation({
  search,
  pathname,
}: {
  search?: string;
  pathname?: string;
}) {
  return (state: AppState, dispatch: WorkspaceDispatchType) => {
    dispatch({
      name: 'action::workspace-context:update-location',
      value: {
        locationSearchQuery: search,
        locationPathname: pathname,
      },
    });
  };
}

export const historyOnInvalidPath = (wsName: string, invalidPath: string) => {
  return (state: AppState, dispatch: WorkspaceDispatchType): void => {
    let _dispatch = dispatch as ApplicationStore<
      WorkspaceSliceState,
      WorkspaceSliceAction | HistoryAction
    >['dispatch'];
    _dispatch({
      name: 'action::bangle-store:history-on-invalid-path',
      value: { wsName: wsName, invalidPath },
    });
  };
};

export const historyUpdatePrimaryWsPath = (
  wsPath: string,
  replace: boolean,
  wsName: string,
) => {
  return (state: AppState, dispatch: WorkspaceDispatchType): void => {
    const sliceState = workspaceSliceKey.getSliceState(state);
    if (sliceState) {
      let openedWsPath = sliceState.openedWsPaths;
      openedWsPath = openedWsPath.updateByIndex(0, wsPath);
      historyUpdateOpenedWsPaths(
        openedWsPath.toArray(),
        replace,
        wsName,
      )(state, dispatch);
    }
  };
};

export const historyUpdateOpenedWsPaths = (
  openedWsPathsArray: (string | null)[],
  replace: boolean,
  wsName: string,
) => {
  return (state: AppState, dispatch: WorkspaceDispatchType): void => {
    let _dispatch = dispatch as ApplicationStore<
      WorkspaceSliceState,
      WorkspaceSliceAction | HistoryAction
    >['dispatch'];

    _dispatch({
      name: 'action::bangle-store:history-update-opened-ws-paths',
      value: { openedWsPathsArray, replace, wsName },
    });
  };
};

export const getFileOps = () => {
  return (
    state: AppState,
    dispatch: WorkspaceDispatchType,
  ): FileOpsType | undefined => {
    let _dispatch = dispatch as ApplicationStore<
      WorkspaceSliceState,
      WorkspaceSliceAction | HistoryAction
    >['dispatch'];

    const sliceState = workspaceSliceKey.getSliceState(state);

    return fileOpsPlus(
      () => {
        if (sliceState?.wsName) {
          _dispatch({
            name: 'action::bangle-store:history-auth-error',
            value: { wsName: sliceState.wsName },
          });
        }
      },
      () => {
        if (sliceState?.wsName) {
          _dispatch({
            name: 'action::bangle-store:history-ws-not-found',
            value: { wsName: sliceState?.wsName },
          });
        }
      },
    );
  };
};

// returns true or false if the current wsName matches
// the one provided in the parameter.
export const isCurrentWsName = (wsName: string) => {
  return (state: AppState): boolean => {
    const sliceState = workspaceSliceKey.getSliceState(state);
    return sliceState?.wsName === wsName;
  };
};

export const refreshWsPaths = () => {
  return (state: AppState, dispatch: WorkspaceDispatchType) => {
    const wsName = workspaceSliceKey.getSliceState(state)?.wsName;

    if (!wsName) {
      return false;
    }

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
      historyOnInvalidPath(wsName, validity.invalidWsPath)(state, dispatch);
      return false;
    }

    historyUpdateOpenedWsPaths(
      newOpened.toArray(),
      replaceHistory,
      wsName,
    )(state, dispatch);

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
    if (wsName && updateLocation) {
      const newOpened = openedWsPaths.updateIfFound(targetWsPath, newWsPath);
      if (!newOpened.equal(openedWsPaths)) {
        historyUpdateOpenedWsPaths(
          newOpened.toArray(),
          true,
          wsName,
        )(state, dispatch);
        return true;
      }
    }

    return false;
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
      historyUpdatePrimaryWsPath(
        wsPath,
        false,
        sliceState.wsName,
      )(store.state, store.dispatch);
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

export const pushWsPath = (
  wsPath: string,
  newTab = false,
  secondary = false,
) => {
  return (state: AppState, dispatch: WorkspaceDispatchType) => {
    if (newTab) {
      if (typeof window !== 'undefined') {
        window.open(encodeURI(resolvePath(wsPath).locationPath));
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

export const checkFileExists = (wsPath: string) => {
  return (
    state: AppState,
    dispatch: WorkspaceDispatchType,
  ): Promise<boolean> => {
    const fileOps = getFileOps()(state, dispatch);

    return fileOps?.checkFileExists(wsPath) || Promise.resolve(false);
  };
};
