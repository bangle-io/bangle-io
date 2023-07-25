import React, { useCallback, useEffect } from 'react';

import { Activitybar, ActivitybarMobile } from '@bangle.io/activitybar';
import { useNsmSlice, useNsmSliceState } from '@bangle.io/api';
import { HELP_FS_WORKSPACE_NAME } from '@bangle.io/constants';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import { NoteSidebar, NoteSidebarShowButton } from '@bangle.io/note-sidebar';
import { nsmSliceWorkspace } from '@bangle.io/nsm-slice-workspace';
import { nsmUI, nsmUISlice } from '@bangle.io/slice-ui';
import { Dhancha } from '@bangle.io/ui-dhancha';
import { WorkspaceSidebar } from '@bangle.io/workspace-sidebar';

import { DialogArea } from './components/DialogArea';
import { NotificationArea } from './components/NotificationArea';
import { ApplicationComponents } from './extension-glue/ApplicationComponents';
import { usePMDevTools } from './hooks/use-pm-dev-tools';
import { useRecentlyUsedWsPaths } from './hooks/use-recently-used-ws-paths';
import { useSetDocumentTitle } from './misc/use-set-document-title';
import { Routes } from './Routes';

let requestedStorage = false;

export function AppContainer() {
  const { wsName } = useNsmSliceState(nsmSliceWorkspace);
  const [{ widescreen, sidebar, noteSidebar }, uiDispatch] =
    useNsmSlice(nsmUISlice);

  const extensionRegistry = useExtensionRegistryContext();

  useSetDocumentTitle();

  const noteSidebarWidgets = extensionRegistry.getNoteSidebarWidgets();

  const currentSidebar = sidebar
    ? extensionRegistry.getSidebars().find((s) => s.name === sidebar)
    : null;

  const onDismissSidebar = useCallback(() => {
    uiDispatch(nsmUI.closeSidebar());
  }, [uiDispatch]);

  const onDismissNoteSidebar = useCallback(() => {
    uiDispatch(nsmUI.updateNoteSidebar(false));
  }, [uiDispatch]);

  const showNoteSidebar = useCallback(() => {
    uiDispatch(nsmUI.updateNoteSidebar(true));
  }, [uiDispatch]);

  useEffect(() => {
    // do not ask for persistence if user never interacted with app
    // if a custom wsName is open, that means they interacted
    if (wsName && wsName !== HELP_FS_WORKSPACE_NAME && !requestedStorage) {
      let storagePersist = async () => {
        if (typeof navigator === 'undefined') {
          return;
        }
        requestedStorage = true;
        let result = await navigator?.storage?.persist?.();
        console.debug(`storage.persist: ${result}`);
      };

      storagePersist();
    }
  }, [wsName]);

  useRecentlyUsedWsPaths();

  usePMDevTools();

  return (
    <>
      <DialogArea />
      <ApplicationComponents />
      <NoteSidebarShowButton
        isNoteSidebarShown={Boolean(noteSidebar)}
        widescreen={widescreen}
        showNoteSidebar={showNoteSidebar}
      />
      <Dhancha
        widescreen={widescreen}
        activitybar={widescreen ? <Activitybar /> : <ActivitybarMobile />}
        noteSidebar={
          noteSidebar && (
            <NoteSidebar
              onDismiss={onDismissNoteSidebar}
              widgets={noteSidebarWidgets}
            />
          )
        }
        workspaceSidebar={
          currentSidebar && (
            <WorkspaceSidebar
              onDismiss={onDismissSidebar}
              sidebar={currentSidebar}
              widescreen={widescreen}
            />
          )
        }
        mainContent={<Routes />}
      />
      <NotificationArea />
    </>
  );
}
