import React, { useCallback, useContext, useEffect, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import { Node } from '@bangle.dev/pm';

import { BaseFileSystemError } from '@bangle.io/baby-fs';
import {
  ExtensionRegistry,
  useExtensionRegistryContext,
} from '@bangle.io/extension-registry';
import {
  HELP_FS_INDEX_FILE_NAME,
  HELP_FS_WORKSPACE_NAME,
} from '@bangle.io/workspaces';
import {
  filePathToWsPath,
  getPrimaryWsPath,
  getSecondaryWsPath,
  History,
  isValidFileWsPath,
  Location,
  OpenedWsPaths,
  PathValidationError,
  resolvePath,
  validateNoteWsPath,
} from '@bangle.io/ws-path';

import { defaultDoc } from './default-doc';
import { fileOpsPlus, FileOpsType } from './use-get-file-ops';
import { useRecentlyUsedWsPaths } from './use-recently-used-ws-paths';
import {
  Selectors,
  useWorkspaceStore,
  WorkspaceDispatch,
  WorkspaceStore,
} from './WorkspaceStore';

const LOG = true;

let log = LOG
  ? console.log.bind(console, 'WorkspaceContextProvider')
  : () => {};

type UpdateOpenedWsPathsType = (
  newOpened: OpenedWsPaths | ((currentOpened: OpenedWsPaths) => OpenedWsPaths),
  options?: { replaceHistory?: boolean },
) => Boolean;

export interface WorkspaceContextType {
  wsName: string | undefined;
  // descending order (first most recent, last least recent)
  // wsPaths
  recentWsPaths: string[];
  fileWsPaths: WorkspaceStore['wsPaths'];
  noteWsPaths: WorkspaceStore['wsPaths'];
  refreshWsPaths: ReturnType<ReturnType<typeof Effects>['refreshWsPaths']>;
  getNote: ReturnType<ReturnType<typeof Effects>['getNote']>;
  createNote: ReturnType<ReturnType<typeof Effects>['createNote']>;
  deleteNote: ReturnType<ReturnType<typeof Effects>['deleteNote']>;
  renameNote: ReturnType<ReturnType<typeof Effects>['renameNote']>;
  primaryWsPath: string | undefined;
  secondaryWsPath: string | undefined;
  openedWsPaths: OpenedWsPaths;
  updateOpenedWsPaths: UpdateOpenedWsPathsType;
  pushWsPath: ReturnType<ReturnType<typeof Effects>['pushWsPath']>;
  checkFileExists: FileOpsType['checkFileExists'];
}

const WorkspaceHooksContext = React.createContext<WorkspaceContextType>(
  {} as any,
);

export function useWorkspaceContext() {
  return useContext(WorkspaceHooksContext);
}

export type OnInvalidPath = (
  wsName: string | undefined,
  history: History,
  invalidPath: string,
) => void;

/**
 *
 * @param {*} param0
 * @returns
 * - noteWsPaths, fileWsPaths - retain their instance if there is no change. This is useful for runing `===` fearlessly.
 */
export function WorkspaceContextProvider({
  children,
  onNativefsAuthError,
  onWorkspaceNotFound,
  onInvalidPath,
}: {
  children: React.ReactNode;
  onNativefsAuthError: (wsName: string | undefined, history: History) => void;
  onWorkspaceNotFound: (wsName: string | undefined, history: History) => void;
  onInvalidPath: OnInvalidPath;
}) {
  const [workspaceStore, storeDispatch] = useWorkspaceStore();
  const extensionRegistry = useExtensionRegistryContext();
  const history = useHistory();
  const location = useLocation<any>();

  const { wsName, openedWsPaths } = useMemo(
    () => ({
      wsName: Selectors.wsName(location),
      openedWsPaths: Selectors.openedWsPaths(location),
    }),
    [location],
  );
  const noteWsPaths = useMemo(() => {
    return Selectors.noteWsPaths(workspaceStore);
  }, [workspaceStore]);

  const onAuthError = useCallback(() => {
    if (wsName) {
      onNativefsAuthError(wsName, history);
    }
  }, [history, wsName, onNativefsAuthError]);

  const _onWorkspaceNoteFound = useCallback(() => {
    if (wsName) {
      onWorkspaceNotFound(wsName, history);
    }
  }, [wsName, history, onWorkspaceNotFound]);

  useRecentlyUsedWsPaths(workspaceStore, storeDispatch, location);

  const effects = useMemo(() => {
    return Effects({
      onAuthError,
      onInvalidPath,
      onWorkspaceNotFound: _onWorkspaceNoteFound,
    });
  }, [onAuthError, onInvalidPath, _onWorkspaceNoteFound]);

  const fileOps = useMemo(() => {
    return effects.getFileOps()();
  }, [effects]);

  const updateOpenedWsPaths = useMemo(() => {
    return effects.updateOpenedWsPaths(location, history);
  }, [effects, location, history]);

  const getNote = useMemo(() => {
    return effects.getNote(extensionRegistry, fileOps);
  }, [extensionRegistry, effects, fileOps]);

  const refreshWsPaths = useMemo(
    () => effects.refreshWsPaths(storeDispatch, wsName, fileOps),
    [storeDispatch, effects, wsName, fileOps],
  );

  const renameNote = useMemo(() => {
    return effects.renameNote(location, fileOps, history, refreshWsPaths);
  }, [location, fileOps, history, refreshWsPaths, effects]);

  const createNote = useMemo(() => {
    return effects.createNote(location, fileOps, refreshWsPaths, history);
  }, [effects, location, fileOps, refreshWsPaths, history]);

  const pushWsPath = useMemo(() => {
    return effects.pushWsPath(updateOpenedWsPaths);
  }, [effects, updateOpenedWsPaths]);

  const deleteNote = useMemo(() => {
    return effects.deleteNote(
      location,
      fileOps,
      updateOpenedWsPaths,
      refreshWsPaths,
    );
  }, [effects, location, fileOps, updateOpenedWsPaths, refreshWsPaths]);

  useEffect(() => {
    storeDispatch({
      type: '@UPDATE_WS_PATHS',
      value: undefined,
    });
    // load the wsPaths on mount
    refreshWsPaths();
  }, [
    storeDispatch,
    refreshWsPaths,
    wsName,
    // when user grants permission to read file
    location?.state?.workspaceStatus,
  ]);

  // TODO fix this weird ness of openedWsPaths not reflecting the true state
  let { primaryWsPath, secondaryWsPath } = openedWsPaths;
  if (wsName === HELP_FS_WORKSPACE_NAME && !primaryWsPath) {
    primaryWsPath = filePathToWsPath(wsName, HELP_FS_INDEX_FILE_NAME);
  }
  if (primaryWsPath && !isValidFileWsPath(primaryWsPath)) {
    onInvalidPath(wsName, history, primaryWsPath);
    primaryWsPath = undefined;
  } else if (secondaryWsPath && !isValidFileWsPath(secondaryWsPath)) {
    onInvalidPath(wsName, history, secondaryWsPath);
    secondaryWsPath = undefined;
  }
  // END_WEIRDNESS

  const value: WorkspaceContextType = useMemo(() => {
    return {
      checkFileExists: fileOps.checkFileExists,
      createNote,
      deleteNote,
      fileWsPaths: workspaceStore.wsPaths,
      getNote,
      noteWsPaths,
      openedWsPaths,
      primaryWsPath,
      pushWsPath: pushWsPath,
      recentWsPaths: workspaceStore.recentlyUsedWsPaths,
      refreshWsPaths,
      renameNote,
      secondaryWsPath,
      updateOpenedWsPaths,
      wsName,
    };
  }, [
    primaryWsPath,
    secondaryWsPath,
    pushWsPath,
    getNote,
    createNote,
    fileOps,
    workspaceStore,
    wsName,
    openedWsPaths,
    noteWsPaths,
    renameNote,
    refreshWsPaths,
    deleteNote,
    updateOpenedWsPaths,
  ]);

  return (
    <WorkspaceHooksContext.Provider value={value}>
      {children}
    </WorkspaceHooksContext.Provider>
  );
}

export const Effects = ({
  onAuthError,
  onWorkspaceNotFound,
  onInvalidPath,
}: {
  onAuthError: () => void;
  onWorkspaceNotFound: () => void;
  onInvalidPath: OnInvalidPath;
}) => {
  const _Effects = {
    getFileOps: () => {
      return () => fileOpsPlus(onAuthError, onWorkspaceNotFound);
    },
    updateOpenedWsPaths: (
      location: Location,
      history: History,
    ): UpdateOpenedWsPathsType => {
      return (newOpened, { replaceHistory = false } = {}): boolean => {
        const wsName = Selectors.wsName(location);
        if (!wsName) {
          return false;
        }
        let primaryWsPath = getPrimaryWsPath(location);
        let secondaryWsPath = getSecondaryWsPath(location);

        if (wsName === HELP_FS_WORKSPACE_NAME && !primaryWsPath) {
          primaryWsPath = filePathToWsPath(wsName, HELP_FS_INDEX_FILE_NAME);
        }

        if (primaryWsPath && !isValidFileWsPath(primaryWsPath)) {
          onInvalidPath(wsName, history, primaryWsPath);
          primaryWsPath = undefined;
        } else if (secondaryWsPath && !isValidFileWsPath(secondaryWsPath)) {
          onInvalidPath(wsName, history, secondaryWsPath);
          secondaryWsPath = undefined;
        }

        const openedWsPaths = Selectors.openedWsPaths(location);
        if (newOpened instanceof Function) {
          newOpened = newOpened(openedWsPaths);
        }

        if (newOpened.equal(openedWsPaths)) {
          return false;
        }
        const newLocation = newOpened.getLocation(location, wsName);

        if (replaceHistory) {
          historyReplace(history, newLocation);
        } else {
          historyPush(history, newLocation);
        }
        return true;
      };
    },

    refreshWsPaths: (
      workspaceDispatch: WorkspaceDispatch,
      wsName: string | undefined,
      fileOps: FileOpsType,
    ): (() => void) => {
      return (): void => {
        if (!wsName) {
          return;
        }
        log('refreshing wsPaths', wsName);
        fileOps
          .listAllFiles(wsName)
          .then((items) => {
            log(
              'received files for wsName',
              wsName,
              'file count',
              items.length,
            );
            workspaceDispatch({
              type: '@UPDATE_WS_PATHS',
              value: items,
            });
            return;
          })
          .catch((error) => {
            workspaceDispatch({
              type: '@UPDATE_WS_PATHS',
              value: undefined,
            });
            // ignore file system error here as other parts of the
            // application should have handled it
            if (error instanceof BaseFileSystemError) {
            } else {
              throw error;
            }
          });
      };
    },

    renameNote: (
      location: Location,
      fileOps: FileOpsType,
      history: History,
      refreshWsPaths: () => void,
    ) => {
      return async (oldWsPath, newWsPath, { updateLocation = true } = {}) => {
        const wsName = Selectors.wsName(location);
        if (!wsName) {
          return;
        }

        const openedWsPaths = Selectors.openedWsPaths(location);

        if (wsName === HELP_FS_WORKSPACE_NAME) {
          throw new PathValidationError('Cannot rename a help document');
        }

        await fileOps.renameFile(oldWsPath, newWsPath);
        if (updateLocation) {
          const newLocation = openedWsPaths
            .updateIfFound(oldWsPath, newWsPath)
            .getLocation(location, wsName);

          historyReplace(history, newLocation);
        }

        refreshWsPaths();
      };
    },

    getNote: (extensionRegistry: ExtensionRegistry, fileOps: FileOpsType) => {
      return async (wsPath: string) => {
        const doc = await fileOps.getDoc(
          wsPath,
          extensionRegistry.specRegistry,
          extensionRegistry.markdownItPlugins,
        );
        return doc;
      };
    },

    createNote: (
      location: Location,
      fileOps: FileOpsType,
      refreshWsPaths: () => void,
      history: History,
    ) => {
      return async (
        // TODO extension registry need not be provided
        extensionRegistry,
        wsPath,
        {
          open = true,
          doc,
        }: {
          open?: Boolean;
          doc?: Node;
        } = {},
      ) => {
        const wsName = Selectors.wsName(location);
        if (!wsName) {
          return;
        }
        const openedWsPaths = Selectors.openedWsPaths(location);

        if (doc == null) {
          doc = defaultDoc(wsPath, extensionRegistry);
        }

        const fileExists = await fileOps.checkFileExists(wsPath);
        if (!fileExists) {
          await fileOps.saveDoc(wsPath, doc, extensionRegistry.specRegistry);
        }
        refreshWsPaths();
        if (open) {
          const newLocation = openedWsPaths
            .updatePrimaryWsPath(wsPath)
            .getLocation(location, wsName);

          historyPush(history, newLocation);
        }
      };
    },

    deleteNote: (
      location: Location,
      fileOps: FileOpsType,
      updateOpenedWsPaths: UpdateOpenedWsPathsType,
      refreshWsPaths: () => void,
    ) => {
      return async (wsPathToDelete: Array<string> | string) => {
        const wsName = Selectors.wsName(location);

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

        let newOpenedWsPaths = Selectors.openedWsPaths(location);

        wsPathToDelete.forEach((w) => {
          validateNoteWsPath(w);
          newOpenedWsPaths = newOpenedWsPaths.closeIfFound(w);
        });

        updateOpenedWsPaths(newOpenedWsPaths, { replaceHistory: true });

        for (let wsPath of wsPathToDelete) {
          await fileOps.deleteFile(wsPath);
        }

        refreshWsPaths();
      };
    },

    pushWsPath: (updateOpenedWsPaths: UpdateOpenedWsPathsType) => {
      return (wsPath, newTab = false, secondary = false) => {
        if (newTab) {
          window.open(encodeURI(resolvePath(wsPath).locationPath));
          return;
        }
        updateOpenedWsPaths((openedWsPath) => {
          if (secondary) {
            return openedWsPath.updateSecondaryWsPath(wsPath);
          }
          return openedWsPath.updatePrimaryWsPath(wsPath);
        });
      };
    },
  };

  return _Effects;
};

function historyReplace(history, newLocation: Location) {
  if (history.location !== newLocation) {
    history.replace(newLocation);
  }
}

function historyPush(history, newLocation: Location) {
  if (history.location !== newLocation) {
    history.push(newLocation);
  }
}
