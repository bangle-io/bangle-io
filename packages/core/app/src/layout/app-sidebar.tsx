import { KEYBOARD_SHORTCUTS } from '@bangle.io/constants';
import { useCoreServices } from '@bangle.io/context';
import {
  DropdownMenu,
  type FileTreeEntry,
  type FileTreeEntryAction,
  KbdShortcut,
  Sidebar,
  AppSidebar as UIAppSidebar,
} from '@bangle.io/ui-components';
import bangleIcon from '@bangle.io/ui-components/src/bangle-transparent_x512.png';
import { WsPath } from '@bangle.io/ws-path';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  BugPlay,
  Command,
  ExternalLink,
  Folder,
  FolderPlus,
  MessageCircle,
  Move,
  Paintbrush2,
  Pencil,
  PlusIcon,
  Search,
  Trash2,
} from 'lucide-react';
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

  const getActionsForEntry = useMemo(
    () =>
      (entry: FileTreeEntry): FileTreeEntryAction[] => {
        const actions: FileTreeEntryAction[] = [];
        const getWsPath = (relativePath: string) =>
          activeWsName
            ? WsPath.fromParts(activeWsName, relativePath).wsPath
            : undefined;

        if (entry.kind === 'directory') {
          const dirWsPath = getWsPath(entry.path);

          actions.push({
            id: 'new-note-here',
            label: t.app.components.appSidebar.newNoteHereActionTitle,
            Icon: PlusIcon,
            onClick: (entry) => {
              commandDispatcher.dispatch(
                'command::ws:quick-new-note',
                {
                  pathPrefix: entry.path,
                },
                'ui',
              );
            },
          });

          actions.push({
            id: 'new-folder-here',
            label: t.app.components.appSidebar.newFolderHereActionTitle,
            Icon: FolderPlus,
            onClick: (entry) => {
              commandDispatcher.dispatch(
                'command::ui:create-directory-dialog',
                {
                  pathPrefix: entry.path,
                },
                'ui',
              );
            },
          });

          if (dirWsPath) {
            actions.push({
              id: 'rename-folder',
              label: t.app.components.appSidebar.renameActionTitle,
              Icon: Pencil,
              onClick: () => {
                commandDispatcher.dispatch(
                  'command::ui:rename-directory-dialog',
                  { dirWsPath },
                  'ui',
                );
              },
            });

            actions.push({
              id: 'delete-folder',
              label: t.app.components.appSidebar.deleteActionTitle,
              Icon: Trash2,
              variant: 'destructive' as const,
              onClick: () => {
                commandDispatcher.dispatch(
                  'command::ui:delete-directory-dialog',
                  { dirWsPath },
                  'ui',
                );
              },
            });
          }

          return actions;
        }

        const wsPath = getWsPath(entry.path);

        if (wsPath) {
          actions.push({
            id: 'rename',
            label: t.app.components.appSidebar.renameActionTitle,
            Icon: Pencil,
            onClick: (entry) => {
              const wsPath = getWsPath(entry.path);
              if (!wsPath) {
                return;
              }
              commandDispatcher.dispatch(
                'command::ui:rename-note-dialog',
                { wsPath },
                'ui',
              );
            },
          });

          actions.push({
            id: 'move',
            label: t.app.components.appSidebar.moveActionTitle,
            Icon: Move,
            onClick: (entry) => {
              const wsPath = getWsPath(entry.path);
              if (!wsPath) {
                return;
              }
              commandDispatcher.dispatch(
                'command::ui:move-note-dialog',
                { wsPath },
                'ui',
              );
            },
          });

          actions.push({
            id: 'delete',
            label: t.app.components.appSidebar.deleteActionTitle,
            Icon: Trash2,
            variant: 'destructive' as const,
            onClick: (entry) => {
              const wsPath = getWsPath(entry.path);
              if (!wsPath) {
                return;
              }
              commandDispatcher.dispatch(
                'command::ui:delete-note-dialog',
                { wsPath },
                'ui',
              );
            },
          });
        }

        return actions;
      },
    [activeWsName, commandDispatcher],
  );

  return (
    <Sidebar.SidebarProvider
      open={sidebarOpen}
      setOpen={(open) => setSidebarOpen(open)}
    >
      <UIAppSidebar
        workspaces={workspaces.map((ws, _i) => ({
          name: ws.name,
          misc: ws.type,
          isActive: activeWsName === ws.name,
        }))}
        filePaths={displayedWsPaths.map((wsPath) => wsPath.path)}
        isTruncated={isTruncated}
        onTruncatedClick={() => {
          commandDispatcher.dispatch(
            'command::ui:toggle-all-files',
            {
              prefillInput: undefined,
            },
            'ui',
          );
        }}
        navItems={activeWsPaths.map((wsPath) => ({
          title: wsPath.fileName || '',
          wsPath: wsPath.wsPath,
        }))}
        wsPathToHref={(wsPath) =>
          navigation.toUri({
            route: 'editor',
            payload: { wsPath },
          })
        }
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
              destDirWsPath: WsPath.fromParts(
                activeWsName,
                destinationDirectory ?? '',
              ).wsPath,
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
        activeFilePaths={activeWsPaths.map((wsPath) => wsPath.path)}
        onSearchClick={() => {
          setOpenOmniSearch(true);
        }}
        getActionsForEntry={getActionsForEntry}
        footerTitle={t.app.sidebar.footerTitle}
        footerChildren={
          <>
            <DropdownMenu.DropdownMenuLabel className="text-muted-foreground text-xs">
              {t.app.sidebar.newLabel}
            </DropdownMenu.DropdownMenuLabel>
            <DropdownMenu.DropdownMenuItem
              onClick={() =>
                commandDispatcher.dispatch(
                  'command::ui:create-note-dialog',
                  {
                    prefillName: undefined,
                  },
                  'ui',
                )
              }
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              <span>{t.app.common.newNote}</span>
            </DropdownMenu.DropdownMenuItem>
            <DropdownMenu.DropdownMenuItem
              onClick={() =>
                commandDispatcher.dispatch(
                  'command::ui:create-workspace-dialog',
                  null,
                  'ui',
                )
              }
            >
              <Folder className="mr-2 h-4 w-4" />
              <span>{t.app.common.newWorkspace}</span>
            </DropdownMenu.DropdownMenuItem>

            <DropdownMenu.DropdownMenuSeparator />
            <DropdownMenu.DropdownMenuLabel className="text-muted-foreground text-xs">
              {t.app.sidebar.appActionsLabel}
            </DropdownMenu.DropdownMenuLabel>
            <DropdownMenu.DropdownMenuItem
              onClick={() => setOpenOmniSearch(true)}
            >
              <Search className="mr-2 h-4 w-4" />
              <span>{t.app.sidebar.omniSearch}</span>
              <KbdShortcut
                className="ml-auto"
                keys={KEYBOARD_SHORTCUTS.toggleOmniSearch.keys}
              />
            </DropdownMenu.DropdownMenuItem>
            <DropdownMenu.DropdownMenuItem
              onClick={() => workbenchState.goToCommandRoute()}
            >
              <Command className="mr-2 h-4 w-4" />
              <span>{t.app.sidebar.allCommands}</span>
            </DropdownMenu.DropdownMenuItem>
            <DropdownMenu.DropdownMenuItem
              onClick={() =>
                commandDispatcher.dispatch('command::ui:switch-theme', {}, 'ui')
              }
            >
              <Paintbrush2 className="mr-2 h-4 w-4" />
              <span>{t.app.sidebar.changeTheme}</span>
            </DropdownMenu.DropdownMenuItem>

            <DropdownMenu.DropdownMenuSeparator />
            <DropdownMenu.DropdownMenuLabel className="text-muted-foreground text-xs">
              {t.app.sidebar.linksLabel}
            </DropdownMenu.DropdownMenuLabel>
            <DropdownMenu.DropdownMenuItem
              onClick={() => window.open('https://bangle.io', '_blank')}
            >
              <img
                src={bangleIcon}
                alt={t.app.common.bangleLogoAlt}
                className="mr-2 h-4 w-4 grayscale"
              />
              <span>{t.app.sidebar.homepage}</span>
            </DropdownMenu.DropdownMenuItem>
            <DropdownMenu.DropdownMenuItem
              onClick={() =>
                window.open('https://github.com/bangle-io/bangle-io', '_blank')
              }
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              <span>{t.app.sidebar.githubProject}</span>
            </DropdownMenu.DropdownMenuItem>
            <DropdownMenu.DropdownMenuItem
              onClick={() =>
                window.open(
                  'https://github.com/bangle-io/bangle-io/issues/new',
                  '_blank',
                )
              }
            >
              <BugPlay className="mr-2 h-4 w-4" />
              <span>{t.app.sidebar.reportIssue}</span>
            </DropdownMenu.DropdownMenuItem>
            <DropdownMenu.DropdownMenuItem
              onClick={() =>
                window.open('https://twitter.com/bangle_io', '_blank')
              }
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              <span>{t.app.sidebar.twitter}</span>
            </DropdownMenu.DropdownMenuItem>
            <DropdownMenu.DropdownMenuItem
              onClick={() =>
                window.open('https://discord.gg/GvvbWJrVQY', '_blank')
              }
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              <span>{t.app.sidebar.discord}</span>
            </DropdownMenu.DropdownMenuItem>
          </>
        }
      />
      <Sidebar.SidebarInset>{children}</Sidebar.SidebarInset>
    </Sidebar.SidebarProvider>
  );
};
