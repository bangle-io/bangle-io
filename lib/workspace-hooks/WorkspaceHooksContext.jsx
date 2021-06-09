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
  deleteFile,
} from 'workspace/index';
import { removeMdExtension } from 'utils/index';

const LOG = true;

let log = LOG
  ? console.log.bind(console, 'WorkspaceHooksContextProvider')
  : () => {};

const WorkspaceHooksContext = React.createContext({});

export function useWorkspaceHooksContext() {
  return useContext(WorkspaceHooksContext);
}

export function WorkspaceHooksContextProvider({ children }) {
  const { wsName } = useWorkspacePath();

  const { fileWsPaths, noteWsPaths, refreshWsPaths } = useFiles(wsName);
  const createNote = useCreateNote({ refreshWsPaths });
  const deleteNote = useDeleteNote({ refreshWsPaths });

  const value = useMemo(() => {
    return { fileWsPaths, noteWsPaths, refreshWsPaths, createNote, deleteNote };
  }, [fileWsPaths, noteWsPaths, refreshWsPaths, createNote, deleteNote]);

  return (
    <WorkspaceHooksContext.Provider value={value}>
      {children}
    </WorkspaceHooksContext.Provider>
  );
}

export function useFiles(wsName) {
  const location = useLocation();

  const [fileWsPaths, setFiles] = useState([]);

  const noteWsPaths = useMemo(() => {
    return fileWsPaths.filter((wsPath) => isValidNoteWsPath(wsPath));
  }, [fileWsPaths]);

  const refreshWsPaths = useCallback(() => {
    log('refreshing wsPaths');
    let destroyed = false;
    if (wsName) {
      listAllFiles(wsName)
        .then((items) => {
          if (!destroyed) {
            setFiles(items);
            return;
          }
        })
        .catch((error) => {
          if (!destroyed) {
            setFiles([]);
          }
          throw error;
        });
    }
    return () => {
      destroyed = true;
    };
  }, [wsName]);

  useEffect(() => {
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
      open && pushWsPath(wsPath);
      await refreshWsPaths();
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
