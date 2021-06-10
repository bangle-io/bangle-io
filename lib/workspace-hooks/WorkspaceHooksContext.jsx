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
  listAllFiles,
  useWorkspacePath,
  isValidNoteWsPath,
  validateNoteWsPath,
  createNote,
  resolvePath,
  renameFile,
  deleteFile,
} from 'workspace/index';
import { shallowCompareArray, removeMdExtension } from 'utils/index';

const LOG = false;

let log = LOG
  ? console.log.bind(console, 'WorkspaceHooksContextProvider')
  : () => {};

const WorkspaceHooksContext = React.createContext({});

export function useWorkspaceHooksContext() {
  return useContext(WorkspaceHooksContext);
}

/**
 *
 * @param {*} param0
 * @returns
 * - noteWsPaths, fileWsPaths - retain their instance if there is no change. This is useful for runing `===` fearlessly.
 */
export function WorkspaceHooksContextProvider({ children }) {
  const { wsName } = useWorkspacePath();

  const { fileWsPaths, noteWsPaths, refreshWsPaths } = useFiles(wsName);
  const createNote = useCreateNote({ refreshWsPaths });
  const deleteNote = useDeleteNote({ refreshWsPaths });
  const renameNote = useRenameNote({ refreshWsPaths });

  const value = useMemo(() => {
    return {
      fileWsPaths,
      noteWsPaths,
      refreshWsPaths,
      createNote,
      deleteNote,
      renameNote,
    };
  }, [
    fileWsPaths,
    noteWsPaths,
    refreshWsPaths,
    createNote,
    deleteNote,
    renameNote,
  ]);

  return (
    <WorkspaceHooksContext.Provider value={value}>
      {children}
    </WorkspaceHooksContext.Provider>
  );
}

export function useFiles(wsName) {
  const location = useLocation();

  const [fileWsPaths, setFiles] = useState(undefined);

  const noteWsPaths = useMemo(() => {
    return fileWsPaths?.filter((wsPath) => isValidNoteWsPath(wsPath));
  }, [fileWsPaths]);

  const refreshWsPaths = useCallback(() => {
    log('refreshing wsPaths', wsName);
    // console.trace();
    let destroyed = false;
    if (wsName) {
      listAllFiles(wsName)
        .then((items) => {
          log('received files for wsName', wsName, 'file count', items.length);
          if (!destroyed) {
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
          }
        })
        .catch((error) => {
          if (!destroyed) {
            setFiles(undefined);
          }
          throw error;
        });
    }
    return () => {
      destroyed = true;
    };
  }, [wsName]);
  if (!window.zz) {
    window.zz = {};
  }
  window.zz[wsName] = refreshWsPaths;

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

export function useRenameNote({ refreshWsPaths }) {
  const {
    wsPath,
    secondaryWsPath,
    replaceWsPath,
    replacePrimaryAndSecondaryWsPath,
    replaceSecondaryWsPath,
  } = useWorkspacePath();

  return useCallback(
    async (oldWsPath, newWsPath, { updateLocation = true } = {}) => {
      await renameFile(wsPath, newWsPath);
      if (updateLocation) {
        // update both at the same time to avoid problem
        // of one editor not finding the older files
        if (secondaryWsPath === wsPath) {
          replacePrimaryAndSecondaryWsPath(newWsPath, newWsPath);
        } else if (oldWsPath === wsPath) {
          replaceWsPath(newWsPath);
        } else if (oldWsPath === secondaryWsPath) {
          replaceSecondaryWsPath(newWsPath);
        }
      }

      await refreshWsPaths();
    },
    [
      wsPath,
      secondaryWsPath,
      refreshWsPaths,
      replaceWsPath,
      replaceSecondaryWsPath,
      replacePrimaryAndSecondaryWsPath,
    ],
  );
}

export function useCreateNote({ refreshWsPaths }) {
  const { pushWsPath } = useWorkspacePath();

  const createNoteCallback = useCallback(
    async (
      bangleIOContext,
      wsPath,
      {
        open = true,
        doc = Node.fromJSON(bangleIOContext.specRegistry.schema, {
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
      await createNote(bangleIOContext, wsPath, doc);
      await refreshWsPaths();
      open && pushWsPath(wsPath);
    },
    [pushWsPath, refreshWsPaths],
  );

  return createNoteCallback;
}

export function useDeleteNote({ refreshWsPaths }) {
  const { wsName, wsPath, secondaryWsPath, removeSecondaryWsPath } =
    useWorkspacePath();
  const history = useHistory();

  const deleteByWsPath = useCallback(
    async (wsPathToDelete) => {
      validateNoteWsPath(wsPathToDelete);

      if (wsPathToDelete === wsPath) {
        history.replace('/ws/' + wsName);
      } else if (wsPathToDelete === secondaryWsPath) {
        removeSecondaryWsPath();
      }
      await deleteFile(wsPathToDelete);
      await refreshWsPaths();
    },
    [
      wsName,
      wsPath,
      history,
      secondaryWsPath,
      removeSecondaryWsPath,
      refreshWsPaths,
    ],
  );

  return deleteByWsPath;
}
