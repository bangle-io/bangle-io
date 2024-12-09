import { useCoreServices } from '@bangle.io/context';
import { Separator, Sidebar } from '@bangle.io/ui-components';
import {
  getParentWsPath,
  pathJoin,
  resolveDirWsPath,
} from '@bangle.io/ws-path';
import { PATH_SEPARATOR } from '@bangle.io/ws-path';
import { useAtomValue } from 'jotai';
import React from 'react';
import { NoteBreadcrumb } from './note-breadcrumb';

export function EditorToolbar() {
  const coreServices = useCoreServices();
  const wsPath = useAtomValue(coreServices.navigation.$wsPath);
  const wsPaths = useAtomValue(coreServices.workspaceState.$wsPaths);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 px-4">
      <Sidebar.SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      {wsPath && (
        <NoteBreadcrumb
          wsPath={wsPath}
          wsPaths={wsPaths}
          onNewNote={({ wsPath }) => {
            const parent = getParentWsPath(wsPath);

            let path = parent && resolveDirWsPath(parent)?.dirPath;

            if (path) {
              path += PATH_SEPARATOR;
            }
            coreServices.commandDispatcher.dispatch(
              'command::ui:create-note-dialog',
              {
                prefillName: path || '',
              },
              'EditorToolbar',
            );
          }}
        />
      )}
    </header>
  );
}
