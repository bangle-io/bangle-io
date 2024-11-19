import { KEYBOARD_SHORTCUTS } from '@bangle.io/constants';
import { useShortcutManager } from '@bangle.io/context';
import { useCoreServices } from '@bangle.io/context';
import type { WorkspaceInfo } from '@bangle.io/types';
import { AppSidebar, Sidebar } from '@bangle.io/ui-components';
import { resolvePath } from '@bangle.io/ws-path';
import React, { useEffect, useMemo } from 'react';

const data = {
  navMain: [
    {
      title: 'Getting Started',
      url: '#',
      items: [
        { title: 'Installation', url: '#' },
        { title: 'Project Structure', url: '#' },
      ],
    },
    {
      title: 'Building Your Application',
      url: '#',
      items: [
        { title: 'Routing', url: '#' },
        { title: 'Data Fetching', url: '#', isActive: true },
        // Other items...
      ],
    },
    // Other nav items...
  ],
  teams: [
    { name: 'Acme Inc', misc: 'Enterprise' },
    { name: 'Acme Corp.', misc: 'Startup' },
    { name: 'Evil Corp.', misc: 'Free' },
  ],
};

interface SidebarProps {
  setOpenWsDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  children: React.ReactNode;
  workspaces: WorkspaceInfo[];
  activeWsName: string | undefined;
  setActiveWsName: (name: string) => void;
  activeWsPaths: string[];
  setActiveWsPaths: (cb: (existing: string[]) => string[]) => void;
}

export const SidebarComponent = ({
  setOpenWsDialog,
  children,
  setOpen,
  workspaces,
  activeWsName,
  setActiveWsName,
  activeWsPaths,
  setActiveWsPaths,
}: SidebarProps) => {
  const shortcutManager = useShortcutManager();

  const coreServices = useCoreServices();
  const logger = coreServices.logger;

  const [wsPaths, setWsPaths] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (activeWsName) {
      coreServices.fileSystem.listFiles(activeWsName).then((files) => {
        setWsPaths(files);
      });
    }
  }, [activeWsName, coreServices]);

  useEffect(() => {
    const deregister = shortcutManager.register(
      {
        ...KEYBOARD_SHORTCUTS.toggleOmniSearch,
      },
      () => {
        setOpen((open) => !open);
      },
      { unique: true },
    );

    return () => {
      deregister();
    };
  }, [shortcutManager, setOpen]);

  logger.debug({ activeWsPaths });

  return (
    <Sidebar.SidebarProvider>
      <AppSidebar
        onTreeItemClick={(item) => {
          logger.debug('Tree item clicked', item);

          const wsPath = item.wsPath;
          if (!item.isDir && wsPath) {
            setActiveWsPaths((existingIn) => {
              let existing = existingIn;
              existing = existing.filter((path) => path !== wsPath);
              return [wsPath, ...existing].slice(0, 5);
            });
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
          url: wsPath,
        }))}
        onNewWorkspaceClick={() => setOpenWsDialog(true)}
        activeWsPaths={activeWsPaths}
        onSearchClick={() => {
          setOpen(true);
        }}
        setActiveWorkspace={(name) => setActiveWsName(name)}
      />
      <Sidebar.SidebarInset>{children}</Sidebar.SidebarInset>
    </Sidebar.SidebarProvider>
  );
};
