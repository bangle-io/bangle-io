import '@bangle.io/editor/src/style.css';
import { useCoreServices } from '@bangle.io/context';
import { OmniSearch } from '@bangle.io/omni-search';
import type { RootEmitter } from '@bangle.io/types';
import {
  Breadcrumb,
  Separator,
  Sidebar,
  Toaster,
} from '@bangle.io/ui-components';
import { useAtom } from 'jotai';
import React from 'react';
import { AppRoutes } from './Routes';
import { AppDialogs } from './app-dialogs';
import { AppErrorHandler } from './app-error-handler';
import { AppSidebar } from './app-sidebar';

export function AppInner({ rootEmitter }: { rootEmitter: RootEmitter }) {
  const coreServices = useCoreServices();
  const [open, setOpen] = useAtom(coreServices.workbenchState.$openOmniSearch);

  return (
    <>
      <AppDialogs />
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
      <Toaster position="top-center" />
      <AppErrorHandler rootEmitter={rootEmitter} />
      <AppSidebar>
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
      </AppSidebar>
    </>
  );
}
