import { KEYBOARD_SHORTCUTS } from '@bangle.io/constants';
import { useShortcutManager } from '@bangle.io/context';
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
}

export const SidebarComponent = ({
  setOpenWsDialog,
  children,
  setOpen,
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
        workspaces={data.teams}
        tree={tree}
        navItems={data.navMain}
        onOpenWorkspace={() => setOpenWsDialog(true)}
        onSearchClick={() => {
          setOpen(true);
        }}
      />
      <Sidebar.SidebarInset>{children}</Sidebar.SidebarInset>
    </Sidebar.SidebarProvider>
  );
};
