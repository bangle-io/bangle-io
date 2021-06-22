import React, { useState, useContext, useEffect, useCallback } from 'react';
import { GenericFileBrowser } from './FileBrowser';
import { useDestroyRef } from 'utils/hooks';
import { UIManagerContext } from 'ui-context';
import { isValidNoteWsPath } from 'ws-path';
import { useWorkspaceContext } from 'workspace-context';
import { HELP_FS_WORKSPACE_NAME, FileOps } from 'workspaces';

export function HelpBrowser() {
  const wsName = HELP_FS_WORKSPACE_NAME;
  const { dispatch, widescreen } = useContext(UIManagerContext);
  const { pushWsPath } = useWorkspaceContext();

  const [files, setFiles] = useState([]);
  const destroyedRef = useDestroyRef();

  useEffect(() => {
    FileOps.listAllFiles(wsName).then((files) => {
      if (!destroyedRef.current) {
        setFiles(files.filter((wsPath) => isValidNoteWsPath(wsPath)));
      }
    });
  }, [destroyedRef, wsName]);

  const closeSidebar = useCallback(() => {
    if (!widescreen) {
      dispatch({
        type: 'UI/TOGGLE_SIDEBAR',
        value: { type: null },
      });
    }
  }, [dispatch, widescreen]);

  const deleteFile = useCallback(async (wsPath) => {}, []);

  const createNewFile = useCallback((path) => {}, []);

  return (
    <GenericFileBrowser
      wsName={wsName}
      files={files}
      deleteFile={deleteFile}
      pushWsPath={pushWsPath}
      widescreen={widescreen}
      activeFilePath={Math.random() + ''}
      closeSidebar={closeSidebar}
      createNewFile={createNewFile}
    />
  );
}
