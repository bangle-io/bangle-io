import { useCoreServices } from '@bangle.io/context';
import { Sidebar, AppSidebar as UIAppSidebar } from '@bangle.io/ui-components';
import {
  assertedResolvePath,
  filePathToWsPath,
  resolvePath,
} from '@bangle.io/ws-path';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import React, { useMemo } from 'react';

const MAX_WS_PATHS = 800;

interface SidebarProps {
  children: React.ReactNode;
}

export const AppSidebar = ({ children }: SidebarProps) => {
  const { commandDispatcher, workspaceState, workbenchState, navigation } =
    useCoreServices();
  const setOpenOmniSearch = useSetAtom(workbenchState.$openOmniSearch);
  const workspaces = useAtomValue(workspaceState.$workspaces);
  const [sidebarOpen, setSidebarOpen] = useAtom(workbenchState.$sidebarOpen);
  const activeWsName = useAtomValue(navigation.$wsName);
  const activeWsPaths = useAtomValue(workspaceState.$activeWsPaths);
  const wsPaths = useAtomValue(workspaceState.$wsPaths);

  const isTruncated = wsPaths.length > MAX_WS_PATHS;
  const displayedWsPaths = useMemo(() => {
    return !isTruncated ? wsPaths : wsPaths.slice(0, MAX_WS_PATHS);
  }, [wsPaths, isTruncated]);

  return (
    <Sidebar.SidebarProvider
      open={sidebarOpen}
      setOpen={(open) => setSidebarOpen(open)}
    >
      <UIAppSidebar
        onFileDrop={(source, destination) => {
          const wsName = assertedResolvePath(source.wsPath).wsName;
          const destWsPath =
            'isRoot' in destination
              ? filePathToWsPath({ wsName, inputPath: '' })
              : destination.wsPath;

          commandDispatcher.dispatch(
            'command::ws:move-ws-path',
            {
              wsPath: source.wsPath,
              destDirWsPath: destWsPath,
            },
            'ui',
          );
        }}
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
        wsPaths={displayedWsPaths}
        isTruncated={isTruncated}
        onTruncatedClick={() => {
          commandDispatcher.dispatch(
            'command::ui:toggle-omni-search',
            {
              prefill: undefined,
            },
            'ui',
          );
        }}
        navItems={activeWsPaths.map((wsPath) => ({
          title: resolvePath(wsPath)?.fileName || '',
          wsPath,
        }))}
        onNewWorkspaceClick={() => {
          commandDispatcher.dispatch(
            'command::ui:create-workspace-dialog',
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
            'command::ws:quick-new-note',
            {
              pathPrefix: undefined,
            },
            'ui',
          );
        }}
        onDeleteFileClick={(item) => {
          commandDispatcher.dispatch(
            'command::ui:delete-note-dialog',
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
