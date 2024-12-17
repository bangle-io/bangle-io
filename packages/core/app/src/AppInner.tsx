import { useCoreServices } from '@bangle.io/context';
import { OmniSearch } from '@bangle.io/omni-search';
import type { RootEmitter } from '@bangle.io/types';
import { Toaster } from '@bangle.io/ui-components';
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
        <AppRoutes />
      </AppSidebar>
    </>
  );
}
