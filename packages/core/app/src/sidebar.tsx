import { useCoreServices } from '@bangle.io/context';
import type { Logger } from '@bangle.io/logger';
import { AppSidebar, Sidebar } from '@bangle.io/ui-components';
import { resolvePath, wsPathToPathname } from '@bangle.io/ws-path';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import React from 'react';

interface SidebarProps {
  children: React.ReactNode;
}

export const SidebarComponent = ({ children }: SidebarProps) => {
  const { commandDispatcher, workspaceState, workbenchState, navigation } =
    useCoreServices();
  const setOpenOmniSearch = useSetAtom(workbenchState.$openOmniSearch);
  const workspaces = useAtomValue(workspaceState.$workspaces);
  const wsPaths = useAtomValue(workspaceState.$wsPaths);
  const [sidebarOpen, setSidebarOpen] = useAtom(workbenchState.$sidebarOpen);
  const activeWsName = useAtomValue(navigation.$wsName);
  const activeWsPaths = useAtomValue(workspaceState.$activeWsPaths);

  return (
    <Sidebar.SidebarProvider
      open={sidebarOpen}
      setOpen={(open) => setSidebarOpen(open)}
    >
      <AppSidebar
        onTreeItemClick={(item) => {
          const wsPath = item.wsPath;
          if (!item.isDir && wsPath) {
            navigation.goWsPath(wsPath);
          }
        }}
        workspaces={workspaces.map((ws, i) => ({
          name: ws.name,
          misc: ws.type,
          isActive: activeWsName == null ? i === 0 : activeWsName === ws.name,
        }))}
        wsPaths={wsPaths}
        navItems={activeWsPaths.map((wsPath) => ({
          title: resolvePath(wsPath).fileName,
          url: wsPathToPathname(wsPath),
        }))}
        onNewWorkspaceClick={() => {
          commandDispatcher.dispatch(
            'command::ui:new-workspace-dialog',
            null,
            'ui',
          );
        }}
        activeWsPaths={activeWsPaths}
        onSearchClick={() => {
          setOpenOmniSearch(true);
        }}
        setActiveWorkspace={(name) => {
          commandDispatcher.dispatch(
            'command::ws:go-workspace',
            { wsName: name },
            'ui',
          );
        }}
        onNewFileClick={() => {
          commandDispatcher.dispatch(
            'command::ui:new-note-dialog',
            {
              prefillName: undefined,
            },
            'ui',
          );
        }}
        onDeleteFileClick={(item) => {
          commandDispatcher.dispatch(
            'command::ui:delete-ws-path-dialog',
            { wsPath: item.wsPath },
            'ui',
          );
        }}
        onRenameFileClick={(item) => {
          commandDispatcher.dispatch(
            'command::ui:rename-note-dialog',
            { wsPath: item.wsPath },
            'ui',
          );
        }}
        onMoveFileClick={(item) => {
          commandDispatcher.dispatch(
            'command::ui:move-note-dialog',
            { wsPath: item.wsPath },
            'ui',
          );
        }}
      />
      <Sidebar.SidebarInset>{children}</Sidebar.SidebarInset>
    </Sidebar.SidebarProvider>
  );
};
