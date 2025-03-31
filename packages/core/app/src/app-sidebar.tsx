import { KEYBOARD_SHORTCUTS } from '@bangle.io/constants';
import { useCoreServices } from '@bangle.io/context';
import {
  DropdownMenu,
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
  Paintbrush2,
  PlusIcon,
  Search,
  Twitter,
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
        onTreeItemCreateNote={(item) => {
          if (item.isDir && item.wsPath) {
            const parent = WsPath.fromString(item.wsPath);
            const path = parent?.path;

            commandDispatcher.dispatch(
              'command::ui:create-note-dialog',
              {
                prefillName: path,
              },
              'ui',
            );
          }
        }}
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
          href: navigation.toUri({
            route: 'editor',
            payload: { wsPath: wsPath.wsPath },
          }),
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
        footerTitle="Bangle.io"
        footerChildren={
          <>
            <DropdownMenu.DropdownMenuLabel className="text-muted-foreground text-xs">
              New
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
              <span>New Note</span>
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
              <span>New Workspace</span>
            </DropdownMenu.DropdownMenuItem>

            <DropdownMenu.DropdownMenuSeparator />
            <DropdownMenu.DropdownMenuLabel className="text-muted-foreground text-xs">
              App Actions
            </DropdownMenu.DropdownMenuLabel>
            <DropdownMenu.DropdownMenuItem
              onClick={() => setOpenOmniSearch(true)}
            >
              <Search className="mr-2 h-4 w-4" />
              <span>Omni Search</span>
              <KbdShortcut
                className="ml-auto"
                keys={KEYBOARD_SHORTCUTS.toggleOmniSearch.keys}
              />
            </DropdownMenu.DropdownMenuItem>
            <DropdownMenu.DropdownMenuItem
              onClick={() => workbenchState.goToCommandRoute()}
            >
              <Command className="mr-2 h-4 w-4" />
              <span>All Commands</span>
            </DropdownMenu.DropdownMenuItem>
            <DropdownMenu.DropdownMenuItem
              onClick={() =>
                commandDispatcher.dispatch('command::ui:switch-theme', {}, 'ui')
              }
            >
              <Paintbrush2 className="mr-2 h-4 w-4" />
              <span>Change Theme</span>
            </DropdownMenu.DropdownMenuItem>

            <DropdownMenu.DropdownMenuSeparator />
            <DropdownMenu.DropdownMenuLabel className="text-muted-foreground text-xs">
              Links
            </DropdownMenu.DropdownMenuLabel>
            <DropdownMenu.DropdownMenuItem
              onClick={() => window.open('https://bangle.io', '_blank')}
            >
              <img
                src={bangleIcon}
                alt="Bangle.io"
                className="mr-2 h-4 w-4 grayscale"
              />
              <span>Homepage</span>
            </DropdownMenu.DropdownMenuItem>
            <DropdownMenu.DropdownMenuItem
              onClick={() =>
                window.open('https://github.com/bangle-io/bangle-io', '_blank')
              }
            >
              <Github className="mr-2 h-4 w-4" />
              <span>GitHub Project</span>
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
              <span>Report an Issue</span>
            </DropdownMenu.DropdownMenuItem>
            <DropdownMenu.DropdownMenuItem
              onClick={() =>
                window.open('https://twitter.com/bangle_io', '_blank')
              }
            >
              <Twitter className="mr-2 h-4 w-4" />
              <span>Twitter</span>
            </DropdownMenu.DropdownMenuItem>
            <DropdownMenu.DropdownMenuItem
              onClick={() =>
                window.open('https://discord.gg/GvvbWJrVQY', '_blank')
              }
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              <span>Discord</span>
            </DropdownMenu.DropdownMenuItem>
          </>
        }
      />
      <Sidebar.SidebarInset>{children}</Sidebar.SidebarInset>
    </Sidebar.SidebarProvider>
  );
};
