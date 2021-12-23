import React, { ReactNode, useCallback, useMemo } from 'react';
import { Redirect, Route } from 'react-router-dom';

import { Activitybar } from '@bangle.io/activitybar';
import { EditorContainer } from '@bangle.io/editor-container';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import { NoteSidebar, NoteSidebarShowButton } from '@bangle.io/note-sidebar';
import type { OnInvalidPathType } from '@bangle.io/shared-types';
import { useUIManagerContext } from '@bangle.io/ui-context';
import { Dhancha, MultiColumnMainContent } from '@bangle.io/ui-dhancha';
import { useWorkspaceContext } from '@bangle.io/workspace-context';
import {
  wsNameToPathname,
  wsPathToPathname,
} from '@bangle.io/workspace-context/helpers';
import { WorkspaceSidebar } from '@bangle.io/workspace-sidebar';
import { HELP_FS_INDEX_WS_PATH } from '@bangle.io/workspaces';

import { ChangelogModal } from './changelog/ChangelogModal';
import { NotificationArea } from './components/NotificationArea';
import { ApplicationComponents } from './extension-glue/ApplicationComponents';
import { PaletteManager } from './extension-glue/PaletteManager';
import { getLastWorkspaceUsed } from './misc/last-workspace-used';
import { useWorkspaceSideEffects } from './misc/use-workspace-side-effects';
import { NewWorkspaceModal } from './new-workspace-modal/NewWorkspaceModal';
import { EmptyEditorPage } from './pages/EmptyEditorPage';
import { WorkspaceInvalidPath } from './pages/WorkspaceInvalidPath';
import { WorkspaceNativefsAuthBlockade } from './pages/WorkspaceNeedsAuth';
import { WorkspaceNotFound } from './pages/WorkspaceNotFound';

export function AppContainer() {
  const { widescreen } = useUIManagerContext();
  const { wsName, openedWsPaths } = useWorkspaceContext();
  const extensionRegistry = useExtensionRegistryContext();
  useWorkspaceSideEffects();

  const sidebars = extensionRegistry.getSidebars();
  const noteSidebarWidgets = extensionRegistry.getNoteSidebarWidgets();
  const actionKeybindings = extensionRegistry.getActionKeybindingMapping();

  const { sidebar, dispatch, noteSidebar } = useUIManagerContext();
  const currentSidebar = sidebar
    ? sidebars.find((s) => s.name === sidebar)
    : null;

  const onDismissSidebar = useCallback(() => {
    dispatch({
      name: 'UI/CHANGE_SIDEBAR',
      value: {
        type: null,
      },
    });
  }, [dispatch]);

  const onDismissNoteSidebar = useCallback(() => {
    dispatch({
      name: 'UI/UPDATE_NOTE_SIDEBAR',
      value: false,
    });
  }, [dispatch]);

  const showNoteSidebar = useCallback(() => {
    dispatch({
      name: 'UI/UPDATE_NOTE_SIDEBAR',
      value: true,
    });
  }, [dispatch]);

  const mainContent = useMemo(() => {
    const result: ReactNode[] = [];

    if (!openedWsPaths.hasSomeOpenedWsPaths()) {
      return <EmptyEditorPage />;
    }

    openedWsPaths.forEachWsPath((wsPath, i) => {
      // avoid split screen for small screens
      if (!widescreen && i > 0) {
        return;
      }
      result.push(
        <EditorContainer
          key={i}
          widescreen={widescreen}
          editorId={i}
          wsPath={wsPath}
        />,
      );
    });

    return <MultiColumnMainContent>{result}</MultiColumnMainContent>;
  }, [openedWsPaths, widescreen]);

  return (
    <>
      <ChangelogModal />
      <NewWorkspaceModal />
      <ApplicationComponents />
      <PaletteManager />
      <NoteSidebarShowButton
        isNoteSidebarShown={Boolean(noteSidebar)}
        widescreen={widescreen}
        showNoteSidebar={showNoteSidebar}
      />
      <Dhancha
        widescreen={widescreen}
        activitybar={
          <Activitybar
            actionKeybindings={actionKeybindings}
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
            />
          )
        }
        mainContent={
          <>
            <Route
              exact
              path="/"
              render={() => {
                const lastWsName = getLastWorkspaceUsed();

                const pathname = lastWsName
                  ? wsNameToPathname(lastWsName)
                  : wsPathToPathname(HELP_FS_INDEX_WS_PATH);

                return (
                  <Redirect
                    to={{
                      pathname,
                    }}
                  />
                );
              }}
            />
            <Route path="/ws/:wsName">{mainContent}</Route>
            <Route path="/ws-nativefs-auth/:wsName">
              <WorkspaceNativefsAuthBlockade
                onWorkspaceNotFound={handleWorkspaceNotFound}
              />
            </Route>
            <Route path="/ws-not-found/:wsName">
              <WorkspaceNotFound />
            </Route>
            <Route path="/ws-invalid-path/:wsName">
              <WorkspaceInvalidPath />
            </Route>
          </>
        }
      />
      <NotificationArea />
    </>
  );
}

export function handleNativefsAuthError(wsName, history) {
  if (history.location?.pathname?.startsWith('/ws-nativefs-auth/' + wsName)) {
    return;
  }
  history.replace({
    pathname: '/ws-nativefs-auth/' + wsName,
    state: {
      previousLocation: history.location,
    },
  });
}

export function handleWorkspaceNotFound(wsName, history) {
  if (history.location?.pathname?.startsWith('/ws-not-found/' + wsName)) {
    return;
  }
  history.replace({
    pathname: '/ws-not-found/' + wsName,
    state: {},
  });
}

export const handleOnInvalidPath: OnInvalidPathType = (
  wsName,
  history,
  invalidPath,
) => {
  console.debug('received invalid path', invalidPath);
  if (history.location?.pathname?.startsWith('/ws-invalid-path/' + wsName)) {
    return;
  }
  history.replace({
    pathname: '/ws-invalid-path/' + wsName,
    state: {},
  });
};
