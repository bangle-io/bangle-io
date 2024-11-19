import { KEYBOARD_SHORTCUTS } from '@bangle.io/constants';
import { useShortcutManager } from '@bangle.io/context';
import type { WorkspaceInfo } from '@bangle.io/types';
import { AppSidebar, Sidebar, type TreeItem } from '@bangle.io/ui-components';

import React, { useEffect } from 'react';

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

const tree: TreeItem[] = [
  'app',
  [
    'api',
    ['hello', ['route.ts']],
    'page.tsx',
    'layout.tsx',
    ['blog', ['page.tsx']],
  ],
];

interface SidebarProps {
  setOpenWsDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  children: React.ReactNode;
  workspaces: WorkspaceInfo[];
  activeWsName: string | undefined;
  setActiveWsName: (name: string) => void;
}

export const SidebarComponent = ({
  setOpenWsDialog,
  children,
  setOpen,
  workspaces,
  activeWsName,
  setActiveWsName,
}: SidebarProps) => {
  const shortcutManager = useShortcutManager();

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

  return (
    <Sidebar.SidebarProvider>
      <AppSidebar
        workspaces={workspaces.map((ws, i) => ({
          name: ws.name,
          misc: ws.type,
          isActive: activeWsName == null ? i === 0 : activeWsName === ws.name,
        }))}
        tree={tree}
        navItems={data.navMain}
        onNewWorkspaceClick={() => setOpenWsDialog(true)}
        onSearchClick={() => {
          setOpen(true);
        }}
        setActiveWorkspace={(name) => setActiveWsName(name)}
      />
      <Sidebar.SidebarInset>{children}</Sidebar.SidebarInset>
    </Sidebar.SidebarProvider>
  );
};
