import React, { useCallback } from 'react';

import { Activitybar } from '@bangle.io/activitybar';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import { NoteSidebar, NoteSidebarShowButton } from '@bangle.io/note-sidebar';
import { useUIManagerContext } from '@bangle.io/slice-ui';
import { useWorkspaceContext } from '@bangle.io/slice-workspace';
import { Dhancha } from '@bangle.io/ui-dhancha';
import { WorkspaceSidebar } from '@bangle.io/workspace-sidebar';

import { DialogArea } from './components/DialogArea';
import { NotificationArea } from './components/NotificationArea';
import { ApplicationComponents } from './extension-glue/ApplicationComponents';
import { useSetDocumentTitle } from './misc/use-set-document-title';
import { Routes } from './Routes';

export function AppContainer() {
  const { widescreen } = useUIManagerContext();
  const { wsName, openedWsPaths } = useWorkspaceContext();
  const extensionRegistry = useExtensionRegistryContext();
  useSetDocumentTitle();

  const sidebars = extensionRegistry.getSidebars();
  const noteSidebarWidgets = extensionRegistry.getNoteSidebarWidgets();
  const operationKeybindings =
    extensionRegistry.getSerialOperationKeybindingMapping();

  const { sidebar, dispatch, noteSidebar } = useUIManagerContext();
  const currentSidebar = sidebar
    ? sidebars.find((s) => s.name === sidebar)
    : null;

  const onDismissSidebar = useCallback(() => {
    dispatch({
      name: 'action::@bangle.io/slice-ui:CHANGE_SIDEBAR',
      value: {
        type: null,
      },
    });
  }, [dispatch]);

  const onDismissNoteSidebar = useCallback(() => {
    dispatch({
      name: 'action::@bangle.io/slice-ui:UPDATE_NOTE_SIDEBAR',
      value: { visible: false },
    });
  }, [dispatch]);

  const showNoteSidebar = useCallback(() => {
    dispatch({
      name: 'action::@bangle.io/slice-ui:UPDATE_NOTE_SIDEBAR',
      value: { visible: true },
    });
  }, [dispatch]);

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
        activitybar={
          <Activitybar
            operationKeybindings={operationKeybindings}
            wsName={wsName}
            primaryWsPath={openedWsPaths.primaryWsPath}
            sidebars={sidebars}
          />
        }
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
