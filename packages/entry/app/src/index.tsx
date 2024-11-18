import '@bangle.io/editor/src/style.css';

import { WorkspaceType } from '@bangle.io/constants';
import {
  CoreServiceProvider,
  PlatformServiceProvider,
  ShortcutProvider,
} from '@bangle.io/context';
import { EditorComp } from '@bangle.io/editor';
import { Logger } from '@bangle.io/logger';
import { OmniSearch } from '@bangle.io/omni-search';
import { WorkspaceService } from '@bangle.io/service-core';
import {
  IdbDatabaseService,
  MemoryDatabaseService,
} from '@bangle.io/service-platform';
import type { WorkspaceInfo } from '@bangle.io/types';
import { WorkspaceDialogRoot } from '@bangle.io/ui-components';
import { Sidebar } from '@bangle.io/ui-components';
import { Breadcrumb, Separator } from '@bangle.io/ui-components';
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

const platformServices = {
  database,
  logger,
};
const coreServices = {
  workspace: workspaceService,
  logger,
};

export function App() {
  const [openWsDialog, setOpenWsDialog] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [workspaces, setWorkspaces] = React.useState<WorkspaceInfo[]>([]);

  const refreshWorkspaces = useCallback(() => {
    workspaceService.getAllWorkspaces().then((ws) => {
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
              workspaceService
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
            setOpenWsDialog={setOpenWsDialog}
            setOpen={setOpen}
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
                <EditorComp
                  wsPath={'ws:test.md'}
                  readNote={async (_wsPath) => {
                    return Array.from({ length: 100 }, () => [
                      '## hello world',
                      'test',
                    ])

                      .flat()
                      .join('\n');
                  }}
                  writeNote={async (_wsPath, _content) => {
                    // const { fileName } = resolvePath(wsPath);
                    // void workspace?.createFile(
                    //   wsPath,
                    //   new File([content], fileName, {
                    //     type: 'text/plain',
                    //   }),
                    // );
                  }}
                />
              </div>
            </div>
          </SidebarComponent>
        </ShortcutProvider>
      </CoreServiceProvider>
    </PlatformServiceProvider>
  );
}
