import '@bangle.io/editor/src/style.css';

import { WorkspaceType } from '@bangle.io/constants';
import {
  CoreServiceProvider,
  type CoreServices,
  PlatformServiceProvider,
  ShortcutProvider,
} from '@bangle.io/context';
import { EditorComp } from '@bangle.io/editor';
import { Logger } from '@bangle.io/logger';
import { OmniSearch } from '@bangle.io/omni-search';
import { FileSystemService, WorkspaceService } from '@bangle.io/service-core';
import {
  FileStorageIndexedDB,
  IdbDatabaseService,
  MemoryDatabaseService,
} from '@bangle.io/service-platform';
import type { WorkspaceInfo } from '@bangle.io/types';
import { WorkspaceDialogRoot } from '@bangle.io/ui-components';
import { Sidebar } from '@bangle.io/ui-components';
import { Breadcrumb, Separator } from '@bangle.io/ui-components';
import { resolvePath } from '@bangle.io/ws-path';
import React, { useCallback } from 'react';
import { SidebarComponent } from './sidebar';

const logger = new Logger(
  '',
  window.location.hostname === 'localhost' ||
    window.location.search.includes('debug=true')
    ? 'debug'
    : 'info',
);

const idbDatabase = new IdbDatabaseService(logger);
const memoryDatabase = new MemoryDatabaseService(logger);

const database = idbDatabase;

const workspaceService = new WorkspaceService(
  logger,
  {
    database,
  },
  (change) => {
    logger.info('Workspace change:', change);
  },
);

const fileStorageService = new FileStorageIndexedDB(logger, (change) => {
  logger.info('File storage change:', change);
});

const fileSystemService = new FileSystemService(
  logger,
  {
    fileStorageService,
  },
  (change) => {
    logger.info('File change:', change);
  },
);

const platformServices = {
  database,
  logger,
};
const coreServices: CoreServices = {
  workspace: workspaceService,
  logger,
  fileSystem: fileSystemService,
};

export function App() {
  const [openWsDialog, setOpenWsDialog] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [workspaces, setWorkspaces] = React.useState<WorkspaceInfo[]>([]);
  const [activeWsName, setActiveWsName] = React.useState(
    workspaces?.[0]?.name || undefined,
  );
  const [activeWsPaths, setActiveWsPaths] = React.useState<string[]>([]);
  const openedWsPath = activeWsPaths[0];

  const refreshWorkspaces = useCallback(() => {
    coreServices.workspace.getAllWorkspaces().then((ws) => {
      setWorkspaces(ws);
    });
  }, []);

  React.useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  logger.info('Workspaces:', workspaces);

  return (
    <PlatformServiceProvider services={platformServices}>
      <CoreServiceProvider services={coreServices}>
        <ShortcutProvider>
          <WorkspaceDialogRoot
            open={openWsDialog}
            onOpenChange={setOpenWsDialog}
            onDone={({ wsName }) => {
              setOpenWsDialog(false);
              coreServices.workspace
                .createWorkspaceInfo({
                  metadata: {},
                  name: wsName,
                  type: WorkspaceType.Browser,
                })
                .then(() => {
                  refreshWorkspaces();
                });
            }}
          />
          <OmniSearch open={open} setOpen={setOpen} />
          <SidebarComponent
            activeWsName={activeWsName}
            activeWsPaths={activeWsPaths}
            setActiveWsName={setActiveWsName}
            setActiveWsPaths={setActiveWsPaths}
            setOpen={setOpen}
            setOpenWsDialog={setOpenWsDialog}
            workspaces={workspaces}
          >
            <header className="flex h-16 shrink-0 items-center gap-2 px-4">
              <Sidebar.SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb.Breadcrumb>
                <Breadcrumb.BreadcrumbList>
                  <Breadcrumb.BreadcrumbItem className="hidden md:block">
                    <Breadcrumb.BreadcrumbLink href="#">
                      Building Your Application
                    </Breadcrumb.BreadcrumbLink>
                  </Breadcrumb.BreadcrumbItem>
                  <Breadcrumb.BreadcrumbSeparator className="hidden md:block" />
                  <Breadcrumb.BreadcrumbItem>
                    <Breadcrumb.BreadcrumbPage>
                      Data Fetching
                    </Breadcrumb.BreadcrumbPage>
                  </Breadcrumb.BreadcrumbItem>
                </Breadcrumb.BreadcrumbList>
              </Breadcrumb.Breadcrumb>
            </header>
            <div className="B-app-main-content flex flex-1 flex-col gap-4 p-4 pt-0">
              <div>
                {/* <div className="grid auto-rows-min gap-4 md:grid-cols-3"> */}
                {openedWsPath && (
                  <EditorComp
                    wsPath={openedWsPath}
                    readNote={async (wsPath) => {
                      return coreServices.fileSystem.readFileAsText(wsPath);
                      // return Array.from({ length: 100 }, () => [
                      //   '## hello world',
                      //   'test',
                      // ])

                      //   .flat()
                      //   .join('\n');
                    }}
                    writeNote={async (wsPath, content) => {
                      const { fileName } = resolvePath(wsPath);
                      void coreServices.fileSystem.createFile(
                        wsPath,
                        new File([content], fileName, {
                          type: 'text/plain',
                        }),
                      );
                    }}
                  />
                )}
              </div>
            </div>
          </SidebarComponent>
        </ShortcutProvider>
      </CoreServiceProvider>
    </PlatformServiceProvider>
  );
}
