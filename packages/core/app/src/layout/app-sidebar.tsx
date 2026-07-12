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
  const {
    commandDispatcher,
    workspaceState,
    workbenchState,
    navigation,
    userActivityService,
  } = useCoreServices();
  const setOpenOmniSearch = useSetAtom(workbenchState.$openOmniSearch);
  const workspaces = useAtomValue(workspaceState.$workspaces);
  const [sidebarOpen, setSidebarOpen] = useAtom(workbenchState.$sidebarOpen);
  const [sidebarWidth, setSidebarWidth] = useAtom(workbenchState.$sidebarWidth);
  const [showNoteFilesOnly, setShowNoteFilesOnly] = useAtom(
    workbenchState.$showNoteFilesOnlyInSidebar,
  );
  const [fileTreeExpanded, setFileTreeExpanded] = useAtom(
    workbenchState.$fileTreeExpanded,
  );
  const activeWsName = useAtomValue(navigation.$wsName);
  const activeWsPaths = useAtomValue(workspaceState.$activeWsPaths);
  const wsPaths = useAtomValue(workspaceState.$wsPaths);
  const noteWsPaths = useAtomValue(workspaceState.$noteWsPaths);
  const starredWsPaths = useAtomValue(userActivityService.$starredWsPaths);
  const fileTreeListState = useAtomValue(workspaceState.$fileTreeListState);

  // Keep this domain-to-view join local until another consumer needs it.
  const starredItems = React.useMemo(() => {
    const notesByWsPath = new Map(
      noteWsPaths.map((wsPath) => [wsPath.wsPath, wsPath]),
    );
    const activePathSet = new Set(activeWsPaths.map((wsPath) => wsPath.wsPath));

    return starredWsPaths.flatMap((starredWsPath) => {
      const wsPath = notesByWsPath.get(starredWsPath);
      return wsPath
        ? [
            {
              title: wsPath.fileName || wsPath.path,
              wsPath: wsPath.wsPath,
              isActive: activePathSet.has(wsPath.wsPath),
            },
          ]
        : [];
    });
  }, [activeWsPaths, noteWsPaths, starredWsPaths]);

  const getActionsForEntry = useSidebarFileActions({
    activeWsName,
    commandDispatcher,
  });

  return (
    <Sidebar.SidebarProvider
      open={sidebarOpen}
      onOpenChange={(open) => setSidebarOpen(open)}
      width={sidebarWidth}
      onWidthChange={setSidebarWidth}
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
        starredItems={starredItems}
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
        fileTreeExpanded={fileTreeExpanded}
        onFileTreeExpandedChange={setFileTreeExpanded}
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
