import '@bangle.io/editor/src/style.css';

import { getGithubUrl } from '@bangle.io/base-utils';
import { c, useC } from '@bangle.io/command-handlers';
import { WorkspaceType } from '@bangle.io/constants';
import { useCoreServices } from '@bangle.io/context';
import { useLogger } from '@bangle.io/context/src/logger-context';
import { OmniSearch } from '@bangle.io/omni-search';
import type { ErrorEmitter, WorkspaceInfo } from '@bangle.io/types';
import {
  Breadcrumb,
  DialogSingleInput,
  Separator,
  Sidebar,
  Toaster,
  WorkspaceDialogRoot,
  toast,
} from '@bangle.io/ui-components';
import React, { useCallback, useEffect } from 'react';
import { AppRoutes } from './Routes';
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
  const [activeWsPaths, setActiveWsPaths] = React.useState<string[]>([]);
  const [newNoteDialog, setNewNoteDialog] = React.useState(false);

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

  useC('command::ui:new-note-dialog', () => {
    setNewNoteDialog(true);
  });

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

      <DialogSingleInput
        open={newNoteDialog}
        placeholder="Enter note name"
        command={{ id: 'new-note-dialog', title: 'Create a new note' }}
        setOpen={setNewNoteDialog}
        onRun={(input) => {
          setNewNoteDialog(false);
          coreServices.commandDispatcher.dispatch(
            'command::ws:new-note-from-input',
            { inputPath: input },
            'ui',
          );
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
        activeWsPaths={activeWsPaths}
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
          <AppRoutes />
        </div>
      </SidebarComponent>
    </>
  );
}
