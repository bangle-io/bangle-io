import { KEYBOARD_SHORTCUTS } from '@bangle.io/constants';
import { useCoreServices } from '@bangle.io/context';
import {
  type Action,
  DropdownMenu,
  type ItemAction,
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
  Folder,
  Github,
  MessageCircle,
  Move,
  Paintbrush2,
  Pencil,
  PlusIcon,
  Search,
  Trash2,
  Twitter,
} from 'lucide-react';
import React, { useMemo } from 'react';
import type { TreeItem } from '@bangle.io/ui-components/src/build-tree';

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

  const fileGroupActions: Action<void>[] = [
    {
      id: 'new-file',
      label: t.app.components.appSidebar.newFileActionTitle,
      Icon: PlusIcon,
      onClick: () => {
        commandDispatcher.dispatch(
          'command::ws:quick-new-note',
          {
            pathPrefix: undefined,
          },
          'ui',
        );
      },
    },
  ];

  const getActionsForItem = useMemo(
    () =>
      (item: TreeItem): ItemAction[] => {
        const actions: ItemAction[] = [];

        if (!item.isDir) {
          // File actions
          actions.push({
            id: 'rename',
            label: 'Rename',
            Icon: Pencil,
            onClick: (item) => {
              commandDispatcher.dispatch(
                'command::ui:rename-note-dialog',
                { wsPath: item.wsPath },
                'ui',
              );
            },
          });

          actions.push({
            id: 'move',
            label: 'Move',
            Icon: Move,
            onClick: (item) => {
              commandDispatcher.dispatch(
                'command::ui:move-note-dialog',
                { wsPath: item.wsPath },
                'ui',
              );
            },
          });

          actions.push({
            id: 'delete',
            label: 'Delete',
            Icon: Trash2,
            variant: 'destructive' as const,
            onClick: (item) => {
              commandDispatcher.dispatch(
                'command::ui:delete-note-dialog',
                { wsPath: item.wsPath },
                'ui',
              );
            },
          });
        }

        return actions;
      },
    [commandDispatcher],
  );

  return (
    <Sidebar.SidebarProvider
      open={sidebarOpen}
      setOpen={(open) => setSidebarOpen(open)}
    >
      <UIAppSidebar
        onFileDrop={(source, destination) => {
          const wsName = WsPath.assert(source.wsPath).wsName;
          const destWsPath =
            'isRoot' in destination
              ? WsPath.fromParts(wsName, '').wsPath
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
        onTreeItemClick={() => {}}
        workspaces={workspaces.map((ws, _i) => ({
          name: ws.name,
          misc: ws.type,
          isActive: activeWsName === ws.name,
        }))}
        wsPaths={displayedWsPaths.map((wsPath) => wsPath.wsPath)}
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
        onNewWorkspaceClick={() => {
          commandDispatcher.dispatch(
            'command::ui:create-workspace-dialog',
            null,
            'ui',
          );
        }}
        activeWsPaths={activeWsPaths.map((wsPath) => wsPath.wsPath)}
        onSearchClick={() => {
          setOpenOmniSearch(true);
        }}
        fileGroupActions={fileGroupActions}
        getActionsForItem={getActionsForItem}
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
              <Github className="mr-2 h-4 w-4" />
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
              <Twitter className="mr-2 h-4 w-4" />
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
