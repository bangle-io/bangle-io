import { useHistory, useLocation } from 'react-router-dom';
import React, {
  useEffect,
  useContext,
  useCallback,
  useState,
  useMemo,
} from 'react';
import { Node } from '@bangle.dev/core/prosemirror/model';
import {
  saveNote,
  renameFile,
  deleteFile,
  listAllFiles,
  checkFileExists,
} from 'workspaces/index';
import { shallowCompareArray, removeMdExtension } from 'utils/index';
import { HELP_FS_INDEX_FILE_NAME, HELP_FS_WORKSPACE_NAME } from 'config';
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

const LOG = false;

let log = LOG
  ? console.log.bind(console, 'WorkspaceContextProvider')
  : () => {};

type RefreshWsPaths = ReturnType<typeof useFiles>['refreshWsPaths'];

interface WorkspaceContextType {
  wsName: string;
  fileWsPaths: ReturnType<typeof useFiles>['fileWsPaths'];
  noteWsPaths: ReturnType<typeof useFiles>['noteWsPaths'];
  refreshWsPaths: RefreshWsPaths;
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
export function WorkspaceContextProvider({ children }) {
  const history = useHistory();
  const location = useLocation();
  const wsName = useWsName(location);
  const { openedWsPaths, updateOpenedWsPaths } = useOpenedWsPaths(
    wsName,
    history,
    location,
  );
  const { primaryWsPath, secondaryWsPath } = openedWsPaths;
  const { fileWsPaths, noteWsPaths, refreshWsPaths } = useFiles(wsName);
  const createNote = useCreateNote(
    wsName,
    openedWsPaths,
    refreshWsPaths,
    history,
    location,
  );

  const deleteNote = useDeleteNote(
    wsName,
    openedWsPaths,
    refreshWsPaths,
    updateOpenedWsPaths,
  );
  const renameNote = useRenameNote(
    wsName,
    openedWsPaths,
    refreshWsPaths,
    history,
    location,
  );

  const pushWsPath = usePushWsPath(updateOpenedWsPaths);

  const value: WorkspaceContextType = useMemo(() => {
    return {
      wsName,
      openedWsPaths,
      fileWsPaths,
      noteWsPaths,
      refreshWsPaths,
      createNote,
      deleteNote,
      renameNote,
      primaryWsPath,
      secondaryWsPath,
      updateOpenedWsPaths,
      pushWsPath,
    };
  }, [
    wsName,
    openedWsPaths,
    primaryWsPath,
    secondaryWsPath,
    fileWsPaths,
    noteWsPaths,
    refreshWsPaths,
    createNote,
    deleteNote,
    renameNote,
    updateOpenedWsPaths,
    pushWsPath,
  ]);

  return (
    <WorkspaceHooksContext.Provider value={value}>
      {children}
    </WorkspaceHooksContext.Provider>
  );
}

function useWsName(location: Location) {
  const wsName = getWsName(location);

  if (!wsName) {
    return HELP_FS_WORKSPACE_NAME;
  }

  return wsName;
}

export function useOpenedWsPaths(
  wsName: string,
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

export function useFiles(wsName) {
  const location = useLocation<any>();

  const [fileWsPaths, setFiles] = useState<undefined | string[]>(undefined);

  const noteWsPaths = useMemo(() => {
    return fileWsPaths?.filter((wsPath) => isValidNoteWsPath(wsPath));
  }, [fileWsPaths]);

  const refreshWsPaths = useCallback(() => {
    log('refreshing wsPaths', wsName);
    if (wsName) {
      listAllFiles(wsName)
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
          throw error;
        });
    }
  }, [wsName]);

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
  wsName: string,
  openedWsPaths: OpenedWsPaths,
  refreshWsPaths: RefreshWsPaths,
  history: History,
  location: Location,
) {
  return useCallback(
    async (oldWsPath, newWsPath, { updateLocation = true } = {}) => {
      if (wsName === HELP_FS_WORKSPACE_NAME) {
        throw new PathValidationError('Cannot rename a help document');
      }

      await renameFile(oldWsPath, newWsPath);
      if (updateLocation) {
        const newLocation = openedWsPaths
          .updateIfFound(oldWsPath, newWsPath)
          .getLocation(location, wsName);

        historyReplace(history, newLocation);
      }

      await refreshWsPaths();
    },
    [openedWsPaths, location, history, wsName, refreshWsPaths],
  );
}

export function useCreateNote(
  wsName: string,
  openedWsPaths: OpenedWsPaths,
  refreshWsPaths: RefreshWsPaths,
  history: History,
  location: Location,
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
      const fileExists = await checkFileExists(wsPath);
      if (!fileExists) {
        await saveNote(extensionRegistry, wsPath, doc);
      }
      await refreshWsPaths();
      if (open) {
        const newLocation = openedWsPaths
          .updatePrimaryWsPath(wsPath)
          .getLocation(location, wsName);

        historyPush(history, newLocation);
      }
    },
    [refreshWsPaths, wsName, location, openedWsPaths, history],
  );

  return createNoteCallback;
}

export function useDeleteNote(
  wsName: string,
  openedWsPaths: OpenedWsPaths,
  refreshWsPaths: RefreshWsPaths,
  updateOpenedWsPaths: ReturnType<
    typeof useOpenedWsPaths
  >['updateOpenedWsPaths'],
) {
  return useCallback(
    async (wsPathToDelete: Array<string> | string) => {
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
        await deleteFile(wsPath);
      }

      await refreshWsPaths();
    },
    [wsName, refreshWsPaths, openedWsPaths, updateOpenedWsPaths],
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
