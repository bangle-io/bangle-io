import { useHistory, useLocation } from 'react-router-dom';
import React, {
  useEffect,
  useContext,
  useCallback,
  useState,
  useMemo,
} from 'react';
import {
  BaseFileSystemError,
  NATIVE_BROWSER_PERMISSION_ERROR,
} from 'baby-fs/index';
import { Node } from '@bangle.dev/core/prosemirror/model';
import {
  FileOps,
  HELP_FS_INDEX_FILE_NAME,
  HELP_FS_WORKSPACE_NAME,
  WORKSPACE_NOT_FOUND_ERROR,
  WorkspaceError,
} from 'workspaces/index';
import {
  shallowCompareArray,
  removeMdExtension,
  serialExecuteQueue,
} from 'utils/index';
import {
  filePathToWsPath,
  getPrimaryWsPath,
  getSecondaryWsPath,
  getWsName,
  OpenedWsPaths,
  Location,
  History,
  validateNoteWsPath,
  PathValidationError,
  isValidNoteWsPath,
  resolvePath,
} from 'ws-path';
import {
  ExtensionRegistry,
  ExtensionRegistryContext,
} from 'extension-registry';

const LOG = false;

let log = LOG
  ? console.log.bind(console, 'WorkspaceContextProvider')
  : () => {};

type RefreshWsPaths = ReturnType<typeof useFiles>['refreshWsPaths'];

interface WorkspaceContextType {
  wsName: string | undefined;
  fileWsPaths: ReturnType<typeof useFiles>['fileWsPaths'];
  noteWsPaths: ReturnType<typeof useFiles>['noteWsPaths'];
  refreshWsPaths: RefreshWsPaths;
  getNote: ReturnType<typeof useGetNote>;
  createNote: ReturnType<typeof useCreateNote>;
  deleteNote: ReturnType<typeof useDeleteNote>;
  renameNote: ReturnType<typeof useRenameNote>;
  primaryWsPath: string | null | undefined;
  secondaryWsPath: string | null | undefined;
  openedWsPaths: OpenedWsPaths;
  updateOpenedWsPaths: ReturnType<
    typeof useOpenedWsPaths
  >['updateOpenedWsPaths'];
  pushWsPath: ReturnType<typeof usePushWsPath>;
  checkFileExists: ReturnType<typeof useGetFileOps>['checkFileExists'];
}

const WorkspaceHooksContext = React.createContext<WorkspaceContextType>(
  {} as any,
);

export function useWorkspaceContext() {
  return useContext(WorkspaceHooksContext);
}

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
}: {
  children: React.ReactNode;
  onNativefsAuthError: (wsName: string | undefined, history: History) => void;
  onWorkspaceNotFound: (wsName: string | undefined, history: History) => void;
}) {
  const extensionRegistry = useContext(ExtensionRegistryContext);
  const history = useHistory();
  const location = useLocation();
  const wsName = useWsName(location);
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

  const fileOps = useGetFileOps(onAuthError, _onWorkspaceNoteFound);
  const { openedWsPaths, updateOpenedWsPaths } = useOpenedWsPaths(
    wsName,
    history,
    location,
  );
  const { primaryWsPath, secondaryWsPath } = openedWsPaths;
  const { fileWsPaths, noteWsPaths, refreshWsPaths } = useFiles(
    wsName,
    fileOps,
  );
  const createNote = useCreateNote(
    wsName,
    openedWsPaths,
    refreshWsPaths,
    history,
    location,
    fileOps,
  );

  const deleteNote = useDeleteNote(
    wsName,
    openedWsPaths,
    refreshWsPaths,
    updateOpenedWsPaths,
    fileOps,
  );
  const renameNote = useRenameNote(
    wsName,
    openedWsPaths,
    refreshWsPaths,
    history,
    location,
    fileOps,
  );

  const getNote = useGetNote(extensionRegistry, fileOps);
  const pushWsPath = usePushWsPath(updateOpenedWsPaths);
  const checkFileExists = fileOps.checkFileExists;

  const value: WorkspaceContextType = useMemo(() => {
    return {
      wsName,
      openedWsPaths,
      fileWsPaths,
      noteWsPaths,
      refreshWsPaths,
      getNote,
      createNote,
      deleteNote,
      renameNote,
      primaryWsPath,
      secondaryWsPath,
      updateOpenedWsPaths,
      pushWsPath,
      checkFileExists,
    };
  }, [
    wsName,
    openedWsPaths,
    primaryWsPath,
    secondaryWsPath,
    fileWsPaths,
    noteWsPaths,
    refreshWsPaths,
    getNote,
    createNote,
    deleteNote,
    renameNote,
    updateOpenedWsPaths,
    pushWsPath,
    checkFileExists,
  ]);

  return (
    <WorkspaceHooksContext.Provider value={value}>
      {children}
    </WorkspaceHooksContext.Provider>
  );
}

function useWsName(location: Location) {
  const wsName = getWsName(location);

  return wsName;
}

export function useOpenedWsPaths(
  wsName: string | undefined,
  history: History,
  location: Location,
) {
  let primaryWsPath = getPrimaryWsPath(location);
  const secondaryWsPath = getSecondaryWsPath(location);

  if (wsName === HELP_FS_WORKSPACE_NAME && !primaryWsPath) {
    primaryWsPath = filePathToWsPath(wsName, HELP_FS_INDEX_FILE_NAME);
  }

  const openedWsPaths = useMemo(
    () => new OpenedWsPaths([primaryWsPath, secondaryWsPath]),
    [primaryWsPath, secondaryWsPath],
  );

  const updateOpenedWsPaths = useCallback(
    (
      newOpened:
        | OpenedWsPaths
        | ((currentOpened: OpenedWsPaths) => OpenedWsPaths),
      { replaceHistory = false } = {},
    ): boolean => {
      if (!wsName) {
        return false;
      }
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
    },
    [wsName, history, openedWsPaths, location],
  );
  return { openedWsPaths, updateOpenedWsPaths };
}

export function useFiles(
  wsName: string | undefined,
  fileOps: ReturnType<typeof useGetFileOps>,
) {
  const location = useLocation<any>();

  const [fileWsPaths, setFiles] = useState<undefined | string[]>(undefined);

  const noteWsPaths = useMemo(() => {
    return fileWsPaths?.filter((wsPath) => isValidNoteWsPath(wsPath));
  }, [fileWsPaths]);
  const refreshWsPaths = useCallback(() => {
    if (!wsName) {
      return;
    }
    log('refreshing wsPaths', wsName);
    fileOps
      .listAllFiles(wsName)
      .then((items) => {
        log('received files for wsName', wsName, 'file count', items.length);
        setFiles((existing) => {
          log('setting files', { existing, items, wsName });
          if (!existing) {
            return items;
          }
          // preserve the identity
          const isEqual = shallowCompareArray(existing, items);
          return isEqual ? existing : items;
        });
        return;
      })
      .catch((error) => {
        setFiles(undefined);
        // ignore file system error here as other parts of the
        // application should have handled it
        if (error instanceof BaseFileSystemError) {
        } else {
          throw error;
        }
      });
  }, [wsName, fileOps]);

  useEffect(() => {
    setFiles(undefined);
    // load the wsPaths on mount
    refreshWsPaths();
  }, [
    refreshWsPaths,
    wsName,
    // when user grants permission to read file
    location.state?.workspaceStatus,
  ]);

  return { fileWsPaths, noteWsPaths, refreshWsPaths };
}

export function useRenameNote(
  wsName: string | undefined,
  openedWsPaths: OpenedWsPaths,
  refreshWsPaths: RefreshWsPaths,
  history: History,
  location: Location,
  fileOps: ReturnType<typeof useGetFileOps>,
) {
  return useCallback(
    async (oldWsPath, newWsPath, { updateLocation = true } = {}) => {
      if (!wsName) {
        return;
      }

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

      await refreshWsPaths();
    },
    [fileOps, openedWsPaths, location, history, wsName, refreshWsPaths],
  );
}

export function useGetNote(
  extensionRegistry: ExtensionRegistry,
  fileOps: ReturnType<typeof useGetFileOps>,
) {
  return useCallback(
    async (wsPath: string) => {
      const doc = await fileOps.getDoc(
        wsPath,
        extensionRegistry.specRegistry,
        extensionRegistry.markdownItPlugins,
      );
      return doc;
    },
    [
      fileOps,
      extensionRegistry.specRegistry,
      extensionRegistry.markdownItPlugins,
    ],
  );
}

export function useCreateNote(
  wsName: string | undefined,
  openedWsPaths: OpenedWsPaths,
  refreshWsPaths: RefreshWsPaths,
  history: History,
  location: Location,
  fileOps: ReturnType<typeof useGetFileOps>,
) {
  const createNoteCallback = useCallback(
    async (
      extensionRegistry,
      wsPath,
      {
        open = true,
        doc = Node.fromJSON(extensionRegistry.specRegistry.schema, {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: {
                level: 1,
              },
              content: [
                {
                  type: 'text',
                  text: removeMdExtension(resolvePath(wsPath).fileName),
                },
              ],
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Hello world!',
                },
              ],
            },
          ],
        }),
      } = {},
    ) => {
      if (!wsName) {
        return;
      }
      const fileExists = await fileOps.checkFileExists(wsPath);
      if (!fileExists) {
        await fileOps.saveDoc(wsPath, doc, extensionRegistry.specRegistry);
      }
      await refreshWsPaths();
      if (open) {
        const newLocation = openedWsPaths
          .updatePrimaryWsPath(wsPath)
          .getLocation(location, wsName);

        historyPush(history, newLocation);
      }
    },
    [refreshWsPaths, wsName, location, openedWsPaths, history, fileOps],
  );

  return createNoteCallback;
}

export function useDeleteNote(
  wsName: string | undefined,
  openedWsPaths: OpenedWsPaths,
  refreshWsPaths: RefreshWsPaths,
  updateOpenedWsPaths: ReturnType<
    typeof useOpenedWsPaths
  >['updateOpenedWsPaths'],
  fileOps: ReturnType<typeof useGetFileOps>,
) {
  return useCallback(
    async (wsPathToDelete: Array<string> | string) => {
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

      let newOpenedWsPaths = openedWsPaths;

      wsPathToDelete.forEach((w) => {
        validateNoteWsPath(w);
        newOpenedWsPaths = newOpenedWsPaths.removeIfFound(w);
      });

      updateOpenedWsPaths(newOpenedWsPaths, { replaceHistory: true });

      for (let wsPath of wsPathToDelete) {
        await fileOps.deleteFile(wsPath);
      }

      await refreshWsPaths();
    },
    [fileOps, wsName, refreshWsPaths, openedWsPaths, updateOpenedWsPaths],
  );
}

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

function usePushWsPath(
  updateOpenedWsPaths: ReturnType<
    typeof useOpenedWsPaths
  >['updateOpenedWsPaths'],
) {
  const pushWsPath = useCallback(
    (wsPath, newTab = false, secondary = false) => {
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
    },
    [updateOpenedWsPaths],
  );
  return pushWsPath;
}

function handleErrors<T extends (...args: any[]) => any>(
  cb: T,
  onAuthNeeded: () => void,
  onWorkspaceNotFound: () => void,
) {
  return (...args: Parameters<T>): ReturnType<T> => {
    return cb(...args).catch((error) => {
      if (
        error instanceof BaseFileSystemError &&
        error.code === NATIVE_BROWSER_PERMISSION_ERROR
      ) {
        onAuthNeeded();
      }
      if (
        error instanceof WorkspaceError &&
        error.code === WORKSPACE_NOT_FOUND_ERROR
      ) {
        onWorkspaceNotFound();
      }
      throw error;
    });
  };
}

/**
 * This whole thing exists so that we can tap into auth errors
 * and do the necessary.
 */
function useGetFileOps(
  onAuthError: () => void,
  onWorkspaceNotFound: () => void,
) {
  const obj = useMemo(() => {
    return {
      renameFile: handleErrors(
        FileOps.renameFile,
        onAuthError,
        onWorkspaceNotFound,
      ),
      deleteFile: handleErrors(
        FileOps.deleteFile,
        onAuthError,
        onWorkspaceNotFound,
      ),
      getDoc: handleErrors(FileOps.getDoc, onAuthError, onWorkspaceNotFound),
      saveDoc: handleErrors(FileOps.saveDoc, onAuthError, onWorkspaceNotFound),
      listAllFiles: handleErrors(
        FileOps.listAllFiles,
        onAuthError,
        onWorkspaceNotFound,
      ),
      checkFileExists: handleErrors(
        FileOps.checkFileExists,
        onAuthError,
        onWorkspaceNotFound,
      ),
    };
  }, [onAuthError, onWorkspaceNotFound]);

  return obj;
}
