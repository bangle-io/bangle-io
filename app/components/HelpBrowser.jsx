import React, { useState, useContext, useEffect, useCallback } from 'react';
import { HELP_FS_WORKSPACE_NAME } from 'config/help-fs';
import { GenericFileBrowser } from './FileBrowser';
import { cachedListAllNoteWsPaths, useWorkspacePath } from 'workspace';
import { useDestroyRef } from 'utils/hooks';
import { UIManagerContext } from 'ui-context';

export function HelpBrowser() {
  const wsName = HELP_FS_WORKSPACE_NAME;
  const { dispatch, widescreen } = useContext(UIManagerContext);
  const { pushWsPath } = useWorkspacePath();

  const [files, setFiles] = useState([]);
  const destroyedRef = useDestroyRef();

  useEffect(() => {
    cachedListAllNoteWsPaths(wsName).then((f) => {
      if (!destroyedRef.current) {
        setFiles(f);
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
