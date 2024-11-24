import { c, useC } from '@bangle.io/command-handlers';
import { useCoreServices } from '@bangle.io/context';
import type { Logger } from '@bangle.io/logger';
import type { WorkspaceInfo } from '@bangle.io/types';
import { AppSidebar, Sidebar } from '@bangle.io/ui-components';
import { resolvePath } from '@bangle.io/ws-path';
import { useAtomValue } from 'jotai';
import React, { useEffect, useMemo } from 'react';

interface SidebarProps {
  setOpenWsDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  children: React.ReactNode;
  workspaces: WorkspaceInfo[];
  activeWsPaths: string[];
  setActiveWsPaths: (cb: (existing: string[]) => string[]) => void;
  logger: Logger;
}

export const SidebarComponent = ({
  setOpenWsDialog,
  children,
  setOpen,
  workspaces,
  activeWsPaths,
}: SidebarProps) => {
  const coreServices = useCoreServices();
  const [wsPaths, setWsPaths] = React.useState<string[]>([]);
  const [sideBarOpen, setSideBarOpen] = React.useState(true);
  const activeWsName = useAtomValue(coreServices.navigation.atom.wsName);

  React.useEffect(() => {
    if (activeWsName) {
      coreServices.fileSystem.listFiles(activeWsName).then((files) => {
        setWsPaths(files);
      });
    }
  }, [activeWsName, coreServices]);

  useC('command::ui:toggle-sidebar', () => {
    setSideBarOpen((open) => !open);
  });

  useC('command::ui:new-workspace-dialog', () => {
    setOpenWsDialog(true);
  });

  return (
    <Sidebar.SidebarProvider
      open={sideBarOpen}
      setOpen={(open) => setSideBarOpen(open)}
    >
      <AppSidebar
        onTreeItemClick={(item) => {
          const wsPath = item.wsPath;
          if (!item.isDir && wsPath) {
            coreServices.navigation.goWsPath(wsPath);
            // setActiveWsPaths((existingIn) => {
            //   let existing = existingIn;
            //   existing = existing.filter((path) => path !== wsPath);
            //   return [wsPath, ...existing].slice(0, 5);
            // });
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
        setActiveWorkspace={(name) => {
          coreServices.navigation.goWorkspace(name);
        }}
      />
      <Sidebar.SidebarInset>{children}</Sidebar.SidebarInset>
    </Sidebar.SidebarProvider>
  );
};
