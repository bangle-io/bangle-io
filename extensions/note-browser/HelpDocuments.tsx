import React, { useState, useContext, useEffect, useCallback } from 'react';
import { GenericFileBrowser } from './NotesTree';
import { useDestroyRef } from 'utils/hooks';
import { useUIManagerContext } from 'ui-context';
import { isValidNoteWsPath } from 'ws-path';
import { useWorkspaceContext } from 'workspace-context';
import { HELP_FS_WORKSPACE_NAME, FileOps } from 'workspaces';
import { ButtonIcon, Sidebar } from 'ui-components';

export function HelpDocuments() {
  const wsName = HELP_FS_WORKSPACE_NAME;
  const { dispatch, widescreen } = useUIManagerContext();
  const { pushWsPath } = useWorkspaceContext();

  const [files, setFiles] = useState<string[]>([]);
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

  const createNewFile = useCallback((path) => {}, []);

  return (
    <Sidebar.Container className="help-documents">
      <Sidebar.Title className="mt-2 px-2">Help documents</Sidebar.Title>
      <Sidebar.ItemContainer className="flex flex-row justify-between my-1 px-2 text-xs">
        <></>
      </Sidebar.ItemContainer>
      <GenericFileBrowser
        wsName={wsName}
        files={files}
        pushWsPath={pushWsPath}
        activeFilePath={Math.random() + ''}
        closeSidebar={closeSidebar}
        createNewFile={createNewFile}
      />
    </Sidebar.Container>
  );
}
