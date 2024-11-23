import '@bangle.io/editor/src/style.css';

import { getGithubUrl } from '@bangle.io/base-utils';
import { WorkspaceType } from '@bangle.io/constants';
import {
  CoreServiceProvider,
  PlatformServiceProvider,
} from '@bangle.io/context';
import { EditorComp } from '@bangle.io/editor';
import { Emitter } from '@bangle.io/emitter';
import { Logger } from '@bangle.io/logger';
import { OmniSearch } from '@bangle.io/omni-search';
import type { ErrorEmitter, WorkspaceInfo } from '@bangle.io/types';
import { Toaster, WorkspaceDialogRoot, toast } from '@bangle.io/ui-components';
import { Sidebar } from '@bangle.io/ui-components';
import { Breadcrumb, Separator } from '@bangle.io/ui-components';
import { resolvePath } from '@bangle.io/ws-path';
import React, { useCallback, useEffect } from 'react';
import { initializeServices } from './service-setup';
import { SidebarComponent } from './sidebar';

const logger = new Logger(
  '',
  window.location.hostname === 'localhost' ||
    window.location.search.includes('debug=true')
    ? 'debug'
    : 'info',
);

const errorEmitter: ErrorEmitter = new Emitter();

const services = initializeServices(logger, errorEmitter);

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
    services.core.workspace.getAllWorkspaces().then((ws) => {
      setWorkspaces(ws);
    });
  }, []);

  React.useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  useEffect(() => {
    const rem2 = errorEmitter.on(
      'event::browser-error-handler-service:app-error',
      (event) => {
        toast.error(`x:${event.error.message}`, {
          duration: Number.POSITIVE_INFINITY,
        });
      },
    );
    const rem1 = errorEmitter.on(
      'event::browser-error-handler-service:error',
      (event) => {
        toast.error(event.error.message, {
          duration: Number.POSITIVE_INFINITY,
          cancel: {
            label: 'Dismiss',
            onClick: () => {},
          },
          action: {
            label: 'Report',
            onClick: () => {
              window.open(getGithubUrl(event.error, logger), '_blank');
            },
          },
        });
      },
    );
    return () => {
      rem2();
      rem1();
    };
  }, []);

  return (
    <PlatformServiceProvider services={services.platform}>
      <CoreServiceProvider services={services.core}>
        <WorkspaceDialogRoot
          open={openWsDialog}
          onOpenChange={setOpenWsDialog}
          onDone={({ wsName }) => {
            services.core.commandDispatcher.dispatch(
              'command::ui:create-new-workspace',
              {
                workspaceType: WorkspaceType.Browser,
                wsName,
              },
              'app',
            );

            setOpenWsDialog(false);
            services.core.workspace
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
        <Toaster />
        <SidebarComponent
          logger={logger}
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
                    return services.core.fileSystem.readFileAsText(wsPath);
                    // return Array.from({ length: 100 }, () => [
                    //   '## hello world',
                    //   'test',
                    // ])

                    //   .flat()
                    //   .join('\n');
                  }}
                  writeNote={async (wsPath, content) => {
                    const { fileName } = resolvePath(wsPath);
                    void services.core.fileSystem.createFile(
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
      </CoreServiceProvider>
    </PlatformServiceProvider>
  );
}
