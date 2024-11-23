import { KEYBOARD_SHORTCUTS } from '@bangle.io/constants';
import { useCoreServices } from '@bangle.io/context';
import type { Logger } from '@bangle.io/logger';
import type { WorkspaceInfo } from '@bangle.io/types';
import { AppSidebar, Sidebar } from '@bangle.io/ui-components';
import { resolvePath } from '@bangle.io/ws-path';
import React, { useEffect, useMemo } from 'react';

interface SidebarProps {
  setOpenWsDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  children: React.ReactNode;
  workspaces: WorkspaceInfo[];
  activeWsName: string | undefined;
  setActiveWsName: (name: string) => void;
  activeWsPaths: string[];
  setActiveWsPaths: (cb: (existing: string[]) => string[]) => void;
  logger: Logger;
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
  logger,
}: SidebarProps) => {
  const coreServices = useCoreServices();

  const [wsPaths, setWsPaths] = React.useState<string[]>([]);
  const [sideBarOpen, setSideBarOpen] = React.useState(true);

  React.useEffect(() => {
    if (activeWsName) {
      coreServices.fileSystem.listFiles(activeWsName).then((files) => {
        setWsPaths(files);
      });
    }
  }, [activeWsName, coreServices]);

  useEffect(() => {
    const deregisterOmni = coreServices.shortcut.register(
      {
        ...KEYBOARD_SHORTCUTS.toggleOmniSearch,
      },
      () => {
        setOpen((open) => !open);
      },
      { unique: true },
    );
    const deregisterSidebar = coreServices.shortcut.register(
      {
        ...KEYBOARD_SHORTCUTS.toggleSidebar,
      },
      () => {
        setSideBarOpen((open) => !open);
      },
      { unique: true },
    );

    return () => {
      deregisterOmni();
      deregisterSidebar();
    };
  }, [coreServices, setOpen]);

  return (
    <Sidebar.SidebarProvider
      open={sideBarOpen}
      setOpen={(open) => setSideBarOpen(open)}
    >
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
