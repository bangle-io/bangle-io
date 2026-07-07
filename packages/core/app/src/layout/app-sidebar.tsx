import { useCoreServices } from '@bangle.io/context';
import { Sidebar, AppSidebar as UIAppSidebar } from '@bangle.io/ui-components';
import { WsDirPath, WsPath } from '@bangle.io/ws-path';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import React from 'react';
import { SidebarFooterMenu } from './sidebar-footer-menu';
import { useSidebarFileActions } from './use-sidebar-file-actions';

interface SidebarProps {
  children: React.ReactNode;
}

export const AppSidebar = ({ children }: SidebarProps) => {
  const { commandDispatcher, workspaceState, workbenchState, navigation } =
    useCoreServices();
  const setOpenOmniSearch = useSetAtom(workbenchState.$openOmniSearch);
  const workspaces = useAtomValue(workspaceState.$workspaces);
  const [sidebarOpen, setSidebarOpen] = useAtom(workbenchState.$sidebarOpen);
  const [showNoteFilesOnly, setShowNoteFilesOnly] = useAtom(
    workbenchState.$showNoteFilesOnlyInSidebar,
  );
  const activeWsName = useAtomValue(navigation.$wsName);
  const activeWsPaths = useAtomValue(workspaceState.$activeWsPaths);
  const wsPaths = useAtomValue(workspaceState.$wsPaths);
  const noteWsPaths = useAtomValue(workspaceState.$noteWsPaths);
  const fileTreeListState = useAtomValue(workspaceState.$fileTreeListState);

  const getActionsForEntry = useSidebarFileActions({
    activeWsName,
    commandDispatcher,
  });

  return (
    <Sidebar.SidebarProvider
      open={sidebarOpen}
      onOpenChange={(open) => setSidebarOpen(open)}
    >
      <UIAppSidebar
        workspaces={workspaces.map((ws, _i) => ({
          name: ws.name,
          misc: ws.type,
          isActive: activeWsName === ws.name,
        }))}
        filePaths={(showNoteFilesOnly ? noteWsPaths : wsPaths).map(
          (wsPath) => wsPath.path,
        )}
        navItems={activeWsPaths.map((wsPath) => ({
          title: wsPath.fileName || '',
          wsPath: wsPath.wsPath,
        }))}
        wsPathToHref={(wsPath) => navigation.toWsFileUri(wsPath)}
        wsNameToHref={(wsName) =>
          navigation.toUri({
            route: 'ws-home',
            payload: { wsName },
          })
        }
        onCreateDirectory={(pathPrefix) => {
          commandDispatcher.dispatch(
            'command::ui:create-directory-dialog',
            {
              pathPrefix,
            },
            'ui',
          );
        }}
        onCreateNote={(pathPrefix) => {
          commandDispatcher.dispatch(
            'command::ws:quick-new-note',
            {
              pathPrefix,
            },
            'ui',
          );
        }}
        onMoveFile={(sourceRelativePath, destinationDirectory) => {
          if (!activeWsName) {
            return;
          }

          commandDispatcher.dispatch(
            'command::ws:move-ws-path',
            {
              destDirWsPath: destinationDirectory
                ? WsDirPath.fromParts(activeWsName, destinationDirectory).wsPath
                : `${activeWsName}:`,
              wsPath: WsPath.fromParts(activeWsName, sourceRelativePath).wsPath,
            },
            'ui',
          );
        }}
        onOpenFile={(relativePath) => {
          if (!activeWsName) {
            return;
          }

          commandDispatcher.dispatch(
            'command::ws:go-ws-path',
            {
              wsPath: WsPath.fromParts(activeWsName, relativePath).wsPath,
            },
            'ui',
          );
        }}
        onNewWorkspaceClick={() => {
          commandDispatcher.dispatch(
            'command::ui:create-workspace-dialog',
            null,
            'ui',
          );
        }}
        onManageWorkspacesClick={() => {
          commandDispatcher.dispatch(
            'command::ui:open-settings-workspaces',
            null,
            'ui',
          );
        }}
        fileTreeNotice={
          fileTreeListState.status === 'error'
            ? {
                message: t.app.components.appSidebar.fileTreeErrorMessage,
                retryLabel: t.app.components.appSidebar.fileTreeErrorRetry,
                onRetry: () => {
                  commandDispatcher.dispatch(
                    'command::ws:refresh-file-tree',
                    null,
                    'ui',
                  );
                },
              }
            : undefined
        }
        activeFilePaths={activeWsPaths.map((wsPath) => wsPath.path)}
        commandButtonClassName="desktop-titlebar-no-drag"
        showNoteFilesOnly={showNoteFilesOnly}
        onShowNoteFilesOnlyChange={setShowNoteFilesOnly}
        onSearchClick={() => {
          setOpenOmniSearch(true);
        }}
        sidebarHeaderClassName="desktop-sidebar-titlebar-header desktop-titlebar-drag"
        workspaceSwitcherWrapperClassName="desktop-titlebar-no-drag"
        getActionsForEntry={getActionsForEntry}
        footerTitle={t.app.sidebar.footerTitle}
        footerChildren={<SidebarFooterMenu />}
      />
      <Sidebar.SidebarInset>{children}</Sidebar.SidebarInset>
    </Sidebar.SidebarProvider>
  );
};
