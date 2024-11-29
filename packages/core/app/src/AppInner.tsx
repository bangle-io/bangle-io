import '@bangle.io/editor/src/style.css';

import { getGithubUrl } from '@bangle.io/base-utils';
import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { useCoreServices } from '@bangle.io/context';
import { useLogger } from '@bangle.io/context/src/logger-context';
import { OmniSearch } from '@bangle.io/omni-search';
import type { RootEmitter } from '@bangle.io/types';
import {
  Breadcrumb,
  DialogSingleInput,
  DialogSingleSelect,
  Separator,
  Sidebar,
  Toaster,
  WorkspaceDialogRoot,
  toast,
} from '@bangle.io/ui-components';
import { useAtom } from 'jotai';
import React, { useEffect } from 'react';
import { AppRoutes } from './Routes';
import { SidebarComponent } from './sidebar';

export function AppInner({
  rootEmitter,
}: {
  rootEmitter: RootEmitter;
}) {
  const coreServices = useCoreServices();
  const logger = useLogger();
  const [openWsDialog, setOpenWsDialog] = useAtom(
    coreServices.workbenchState.$openWsDialog,
  );
  const [open, setOpen] = useAtom(coreServices.workbenchState.$openOmniSearch);

  const [singleSelectDialog, setSingleSelectDialog] = useAtom(
    coreServices.workbenchState.$singleSelectDialog,
  );

  const [singleInputDialog, setSingleInputDialog] = useAtom(
    coreServices.workbenchState.$singleInputDialog,
  );

  useEffect(() => {
    const controller = new AbortController();
    rootEmitter.on(
      'event::error:uncaught-error',
      (event) => {
        if (event.appLikeError) {
          toast.error(`${event.error.message}`, {
            duration: 5000,
          });
          return;
        }

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
      controller.signal,
    );
    return () => {
      controller.abort();
    };
  }, [rootEmitter, logger]);

  return (
    <>
      <WorkspaceDialogRoot
        open={openWsDialog}
        onOpenChange={setOpenWsDialog}
        onDone={({ wsName }) => {
          setOpenWsDialog(false);
          coreServices.workspaceOps.createWorkspaceInfo({
            metadata: {},
            name: wsName,
            type: WORKSPACE_STORAGE_TYPE.Browser,
          });
        }}
      />

      <DialogSingleInput
        key={singleInputDialog?.dialogId}
        open={Boolean(singleInputDialog)}
        setOpen={(open) => {
          setSingleInputDialog(
            open && singleInputDialog ? singleInputDialog : undefined,
          );
        }}
        onSelect={singleInputDialog?.onSelect || (() => {})}
        placeholder={singleInputDialog?.placeholder}
        badgeText={singleInputDialog?.badgeText}
        badgeTone={singleInputDialog?.badgeTone}
        groupHeading={singleInputDialog?.groupHeading}
        Icon={singleInputDialog?.Icon}
        option={singleInputDialog?.option || { id: '' }}
        initialSearch={singleInputDialog?.initialSearch}
      />

      <DialogSingleSelect
        // reset component based on id otherwise it persists previous state
        key={singleSelectDialog?.dialogId}
        open={Boolean(singleSelectDialog)}
        setOpen={(open) => {
          setSingleSelectDialog(
            open && singleSelectDialog ? singleSelectDialog : undefined,
          );
        }}
        options={singleSelectDialog?.options || []}
        onSelect={singleSelectDialog?.onSelect || (() => {})}
        placeholder={singleSelectDialog?.placeholder}
        badgeText={singleSelectDialog?.badgeText}
        badgeTone={singleSelectDialog?.badgeTone}
        groupHeading={singleSelectDialog?.groupHeading}
        emptyMessage={singleSelectDialog?.emptyMessage}
        Icon={singleSelectDialog?.Icon}
        initialSearch={singleSelectDialog?.initialSearch}
      />
      <OmniSearch
        open={open}
        setOpen={setOpen}
        commands={coreServices.commandRegistry.getOmniSearchCommands()}
        onCommand={(cmd) => {
          setOpen(false);
          Promise.resolve().then(() => {
            coreServices.commandDispatcher.dispatch(
              // @ts-expect-error - command id will be correct
              cmd.id,
              {},
              'omni-search',
            );
          });
        }}
      />
      <Toaster />
      <SidebarComponent>
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
