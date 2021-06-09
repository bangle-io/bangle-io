import React, { useContext, useCallback, useState, useMemo } from 'react';
import { useEffect } from 'react/cjs/react.development';
import {
  listAllFiles,
  useWorkspacePath,
  isValidNoteWsPath,
} from 'workspace/index';

const WorkspaceHooksContext = React.createContext({});

export function useWorkspaceHooksContext() {
  return useContext(WorkspaceHooksContext);
}

export function WorkspaceHooksContextProvider({ children }) {
  const { wsName } = useWorkspacePath();

  const { fileWsPaths, noteWsPaths, refreshWsPaths } = useFiles(wsName);

  const value = useMemo(() => {
    return { fileWsPaths, noteWsPaths, refreshWsPaths };
  }, [fileWsPaths, noteWsPaths, refreshWsPaths]);

  return (
    <WorkspaceHooksContext.Provider value={value}>
      {children}
    </WorkspaceHooksContext.Provider>
  );
}

export function useFiles(wsName) {
  const [fileWsPaths, setFiles] = useState([]);

  const noteWsPaths = useMemo(() => {
    return fileWsPaths.filter((wsPath) => isValidNoteWsPath(wsPath));
  }, [fileWsPaths]);

  const refreshWsPaths = useCallback(() => {
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
  }, [refreshWsPaths]);

  return { fileWsPaths, noteWsPaths, refreshWsPaths };
}
