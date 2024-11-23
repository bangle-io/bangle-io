import '@bangle.io/editor/src/style.css';

import { getGithubUrl } from '@bangle.io/base-utils';
import { c } from '@bangle.io/command-handlers';
import { WorkspaceType } from '@bangle.io/constants';
import { useCoreServices } from '@bangle.io/context';
import { EditorComp } from '@bangle.io/editor';

import { useLogger } from '@bangle.io/context/src/logger-context';
import { OmniSearch } from '@bangle.io/omni-search';
import type { ErrorEmitter, WorkspaceInfo } from '@bangle.io/types';
import {
  Breadcrumb,
  Separator,
  Sidebar,
  Toaster,
  WorkspaceDialogRoot,
  toast,
} from '@bangle.io/ui-components';
import { resolvePath } from '@bangle.io/ws-path';
import React, { useCallback, useEffect } from 'react';
import { SidebarComponent } from './sidebar';

export function AppInner({
  errorEmitter,
}: {
  errorEmitter: ErrorEmitter;
}) {
  const coreServices = useCoreServices();
  const logger = useLogger();
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
  }, [coreServices.workspace]);

  React.useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  useEffect(() => {
    const unregister = coreServices.commandRegistry.registerHandler(
      c('command::ui:toggle-omni-search', () => {
        setOpen((open) => !open);
      }),
    );
    return () => {
      unregister();
    };
  }, [coreServices.commandRegistry]);

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
  }, [errorEmitter, logger]);

  return (
    <>
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
      <OmniSearch
        open={open}
        setOpen={setOpen}
        commands={coreServices.commandRegistry.getOmniSearchCommands()}
        onCommand={(cmd) => {
          coreServices.commandDispatcher.dispatch(
            // @ts-expect-error - command id will be correct
            cmd.id,
            {},
            'omni-search',
          );
        }}
      />
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
            {openedWsPath && (
              <EditorComp
                wsPath={openedWsPath}
                readNote={async (wsPath) => {
                  return coreServices.fileSystem.readFileAsText(wsPath);
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
    </>
  );
}
