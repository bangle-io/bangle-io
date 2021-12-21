import { Node } from '@bangle.dev/pm';

import { BaseFileSystemError } from '@bangle.io/baby-fs';
import { ApplicationStore, AppState } from '@bangle.io/create-store';
import { ExtensionRegistry } from '@bangle.io/extension-registry';
import type { HistoryAction } from '@bangle.io/shared-types';
import {
  HELP_FS_INDEX_FILE_NAME,
  HELP_FS_WORKSPACE_NAME,
  WORKSPACE_NOT_FOUND_ERROR,
  WorkspaceError,
} from '@bangle.io/workspaces';
import {
  filePathToWsPath,
  isValidFileWsPath,
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
import type { WorkspaceSliceState } from './slice-state';
import { fileOpsPlus, FileOpsType } from './use-get-file-ops';

const LOG = true;
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
    store: ApplicationStore,
  ): FileOpsType | undefined => {
    let _dispatch = dispatch as ApplicationStore<
      WorkspaceSliceState,
      WorkspaceSliceAction | HistoryAction
    >['dispatch'];

    return fileOpsPlus(
      () => {
        const sliceState = workspaceSliceKey.getSliceState(store.state);
        if (sliceState?.wsName) {
          _dispatch({
            name: 'action::bangle-store:history-auth-error',
            value: { wsName: sliceState.wsName },
          });
        }
      },
      () => {
        const sliceState = workspaceSliceKey.getSliceState(store.state);
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

export const updateWsPaths = () => {
  return (
    state: AppState,
    dispatch: WorkspaceDispatchType,
    store: ApplicationStore,
  ) => {
    let wsName = workspaceSliceKey.getSliceState(state)?.wsName;

    if (!wsName) {
      return;
    }

    log('refreshing wsPaths', wsName);

    const fileOps = getFileOps()(state, dispatch, store);

    fileOps
      ?.listAllFiles(wsName)
      .then((items) => {
        if (!wsName) {
          return;
        }
        log('received files for wsName', wsName, 'file count', items.length);

        if (!isCurrentWsName(wsName)(store.state)) {
          log('not current wsName', wsName);
          return;
        }

        dispatch({
          name: 'action::workspace-context:update-ws-paths',
          value: items,
        });
        return;
      })
      .catch((error) => {
        if (!wsName) {
          return;
        }

        if (isCurrentWsName(wsName)(store.state)) {
          dispatch({
            name: 'action::workspace-context:update-ws-paths',
            value: undefined,
          });
        }

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

    const { wsName, openedWsPaths } = sliceState;

    let primaryWsPath = openedWsPaths.getByIndex(0);
    let secondaryWsPath = openedWsPaths.getByIndex(1);

    if (wsName === HELP_FS_WORKSPACE_NAME && !primaryWsPath) {
      primaryWsPath = filePathToWsPath(wsName, HELP_FS_INDEX_FILE_NAME);
    }

    if (primaryWsPath && !isValidFileWsPath(primaryWsPath)) {
      historyOnInvalidPath(wsName, primaryWsPath)(state, dispatch);
      primaryWsPath = undefined;
      return false;
    } else if (secondaryWsPath && !isValidFileWsPath(secondaryWsPath)) {
      historyOnInvalidPath(wsName, secondaryWsPath);
      secondaryWsPath = undefined;
      return false;
    }

    if (newOpened instanceof Function) {
      newOpened = newOpened(openedWsPaths);
    }

    if (newOpened.equal(openedWsPaths)) {
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

export const renameNote = (
  oldWsPath: string,
  newWsPath: string,
  { updateLocation = true } = {},
) => {
  return (
    state: AppState,
    dispatch: WorkspaceDispatchType,
    store: ApplicationStore,
  ) => {
    const fileOps = getFileOps()(state, dispatch, store);

    const sliceState = workspaceSliceKey.getSliceState(state);
    const wsName = sliceState?.wsName;

    if (!wsName || !sliceState || !fileOps) {
      return;
    }

    const { openedWsPaths } = sliceState;

    if (wsName === HELP_FS_WORKSPACE_NAME) {
      throw new PathValidationError('Cannot rename a help document');
    }

    fileOps.renameFile(oldWsPath, newWsPath).then(() => {
      if (updateLocation) {
        const newOpened = openedWsPaths.updateIfFound(oldWsPath, newWsPath);

        historyUpdateOpenedWsPaths(
          newOpened.toArray(),
          true,
          wsName,
        )(state, dispatch);
      }

      updateWsPaths()(store.state, dispatch, store);
    });
  };
};

export const getNote = (
  extensionRegistry: ExtensionRegistry,
  wsPath: string,
) => {
  return async (
    state: AppState,
    dispatch: WorkspaceDispatchType,
    store: ApplicationStore,
  ) => {
    const fileOps = getFileOps()(state, dispatch, store);
    if (fileOps) {
      return fileOps.getDoc(
        wsPath,
        extensionRegistry.specRegistry,
        extensionRegistry.markdownItPlugins,
      );
    }
    return undefined;
  };
};

export const createNote = (
  // TODO extension registry need not be provided
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
    state: AppState,
    dispatch: WorkspaceDispatchType,
    store: ApplicationStore,
  ) => {
    const fileOps = getFileOps()(state, dispatch, store);
    const sliceState = workspaceSliceKey.getSliceState(state);

    if (!fileOps || !sliceState) {
      return;
    }

    const wsName = sliceState.wsName;

    if (!wsName) {
      return;
    }

    const { openedWsPaths } = sliceState;

    if (doc == null) {
      doc = defaultDoc(wsPath, extensionRegistry);
    }

    const fileExists = await fileOps.checkFileExists(wsPath);
    if (!fileExists) {
      await fileOps.saveDoc(wsPath, doc, extensionRegistry.specRegistry);
    }

    updateWsPaths()(store.state, dispatch, store);

    if (open) {
      const newOpened = openedWsPaths.updatePrimaryWsPath(wsPath);

      historyUpdateOpenedWsPaths(
        newOpened.toArray(),
        false,
        wsName,
      )(state, dispatch);
    }
  };
};

export const deleteNote = (wsPathToDelete: Array<string> | string) => {
  return async (
    state: AppState,
    dispatch: WorkspaceDispatchType,
    store: ApplicationStore,
  ) => {
    const fileOps = getFileOps()(state, dispatch, store);
    const sliceState = workspaceSliceKey.getSliceState(state);

    if (!fileOps || !sliceState) {
      return;
    }

    const wsName = sliceState.wsName;

    if (!wsName) {
      return;
    }

    if (wsName === HELP_FS_WORKSPACE_NAME) {
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
      state,
      dispatch,
    );

    for (let wsPath of wsPathToDelete) {
      await fileOps.deleteFile(wsPath);
    }

    updateWsPaths()(store.state, dispatch, store);
  };
};

export const pushWsPath = (wsPath, newTab = false, secondary = false) => {
  return async (
    state: AppState,
    dispatch: WorkspaceDispatchType,
    store: ApplicationStore,
  ) => {
    if (newTab) {
      if (typeof window !== 'undefined') {
        window.open(encodeURI(resolvePath(wsPath).locationPath));
      }
      return;
    }
    updateOpenedWsPaths((openedWsPath) => {
      if (secondary) {
        return openedWsPath.updateSecondaryWsPath(wsPath);
      }
      return openedWsPath.updatePrimaryWsPath(wsPath);
    })(state, dispatch);
  };
};
