import React, { useCallback, useEffect, useState } from 'react';

import { Sidebar } from '@bangle.io/ui-components';
import { useUIManagerContext } from '@bangle.io/ui-context';
import { useDestroyRef } from '@bangle.io/utils';
import { useWorkspaceContext } from '@bangle.io/workspace-context';
import { FileOps, HELP_FS_WORKSPACE_NAME } from '@bangle.io/workspaces';
import { isValidNoteWsPath } from '@bangle.io/ws-path';

import { GenericFileBrowser } from './NotesTree';

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
      <Sidebar.Title className="px-2 mt-2">Help documents</Sidebar.Title>
      <Sidebar.ItemContainer className="flex flex-row justify-between px-2 my-1 text-xs">
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
