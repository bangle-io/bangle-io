import { KEYBOARD_SHORTCUTS } from '@bangle.io/constants';
import { useCoreServices } from '@bangle.io/context';
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  KbdShortcut,
  Sidebar,
  AppSidebar as UIAppSidebar,
} from '@bangle.io/ui-components';
import { DropdownMenuLabel } from '@bangle.io/ui-components';
import bangleIcon from '@bangle.io/ui-components/src/bangle-transparent_x512.png';
import {
  assertedResolvePath,
  filePathToWsPath,
  resolvePath,
} from '@bangle.io/ws-path';
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
            'command::ui:toggle-all-files',
            {
              prefillInput: undefined,
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
        footerTitle="Bangle.io"
        footerChildren={
          <>
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              New
            </DropdownMenuLabel>
            <DropdownMenuItem
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
            </DropdownMenuItem>
            <DropdownMenuItem
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
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              App Actions
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setOpenOmniSearch(true)}>
              <Search className="mr-2 h-4 w-4" />
              <span>Omni Search</span>
              <KbdShortcut
                className="ml-auto"
                keys={KEYBOARD_SHORTCUTS.toggleOmniSearch.keys}
              />
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => workbenchState.goToCommandRoute()}>
              <Command className="mr-2 h-4 w-4" />
              <span>All Commands</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                commandDispatcher.dispatch('command::ui:switch-theme', {}, 'ui')
              }
            >
              <Paintbrush2 className="mr-2 h-4 w-4" />
              <span>Change Theme</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Links
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => window.open('https://bangle.io', '_blank')}
            >
              <img
                src={bangleIcon}
                alt="Bangle.io"
                className="mr-2 h-4 w-4 grayscale"
              />
              <span>Homepage</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                window.open('https://github.com/bangle-io/bangle-io', '_blank')
              }
            >
              <Github className="mr-2 h-4 w-4" />
              <span>GitHub Project</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                window.open(
                  'https://github.com/bangle-io/bangle-io/issues/new',
                  '_blank',
                )
              }
            >
              <BugPlay className="mr-2 h-4 w-4" />
              <span>Report an Issue</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                window.open('https://twitter.com/bangle_io', '_blank')
              }
            >
              <Twitter className="mr-2 h-4 w-4" />
              <span>Twitter</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                window.open('https://discord.gg/GvvbWJrVQY', '_blank')
              }
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              <span>Discord</span>
            </DropdownMenuItem>
          </>
        }
      />
      <Sidebar.SidebarInset>{children}</Sidebar.SidebarInset>
    </Sidebar.SidebarProvider>
  );
};
