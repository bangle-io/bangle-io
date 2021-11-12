import React, { ReactNode, useMemo } from 'react';
import { Redirect, Route } from 'react-router-dom';

import { Activitybar } from '@bangle.io/activitybar';
import { EditorContainer } from '@bangle.io/editor-container';
import { useEditorManagerContext } from '@bangle.io/editor-manager-context';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import { useUIManagerContext } from '@bangle.io/ui-context';
import { Dhancha, MultiColumnMainContent } from '@bangle.io/ui-dhancha';
import { useWorkspaceContext } from '@bangle.io/workspace-context';
import { WorkspaceSidebar } from '@bangle.io/workspace-sidebar';
import { HELP_FS_WORKSPACE_NAME } from '@bangle.io/workspaces';

import { Changelog } from './changelog/Changelog';
import { NotificationArea } from './components/NotificationArea';
import { ApplicationComponents } from './extension-glue/ApplicationComponents';
import { PaletteManager } from './extension-glue/PaletteManager';
import { getLastWorkspaceUsed } from './misc/last-workspace-used';
import { useWorkspaceSideEffects } from './misc/use-workspace-side-effects';
import { EmptyEditorPage } from './pages/EmptyEditorPage';
import { WorkspaceNativefsAuthBlockade } from './pages/WorkspaceNeedsAuth';
import { WorkspaceNotFound } from './pages/WorkspaceNotFound';

export function AppContainer() {
  const { widescreen } = useUIManagerContext();
  const { wsName, primaryWsPath, openedWsPaths } = useWorkspaceContext();
  const extensionRegistry = useExtensionRegistryContext();
  const { setEditor } = useEditorManagerContext();
  useWorkspaceSideEffects();

  const sidebars = extensionRegistry.getSidebars();
  const actionKeybindings = extensionRegistry.getActionKeybindingMapping();

  const { sidebar } = useUIManagerContext();
  const currentSidebar = sidebar
    ? sidebars.find((s) => s.name === sidebar)
    : null;

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
          extensionRegistry={extensionRegistry}
          setEditor={setEditor}
          wsPath={wsPath}
        />,
      );
    });

    return <MultiColumnMainContent>{result}</MultiColumnMainContent>;
  }, [openedWsPaths, setEditor, widescreen, extensionRegistry]);

  return (
    <>
      <Changelog />
      <ApplicationComponents />
      <PaletteManager />
      <Dhancha
        widescreen={widescreen}
        activitybar={
          <Activitybar
            actionKeybindings={actionKeybindings}
            wsName={wsName}
            primaryWsPath={primaryWsPath}
            sidebars={sidebars}
          />
        }
        noteSidebar={undefined}
        workspaceSidebar={
          currentSidebar && (
            <WorkspaceSidebar wsName={wsName} sidebar={currentSidebar} />
          )
        }
        mainContent={
          <>
            <Route
              exact
              path="/"
              render={() => {
                const lastWsName = getLastWorkspaceUsed();
                return (
                  <Redirect
                    to={{
                      pathname:
                        '/ws/' +
                        (lastWsName ? lastWsName : HELP_FS_WORKSPACE_NAME),
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
