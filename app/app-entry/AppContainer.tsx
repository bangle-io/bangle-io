import React, { ReactNode, useMemo } from 'react';

import { Activitybar } from '@bangle.io/activitybar';
import { EditorContainer } from '@bangle.io/editor-container';
import { useEditorManagerContext } from '@bangle.io/editor-manager-context';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import { useUIManagerContext } from '@bangle.io/ui-context';
import { Dhancha, MultiColumnMainContent } from '@bangle.io/ui-dhancha';
import { useWorkspaceContext } from '@bangle.io/workspace-context';
import { WorkspaceSidebar } from '@bangle.io/workspace-sidebar';

import { Changelog } from './changelog/Changelog';
import { NotificationArea } from './components/NotificationArea';
import { ApplicationComponents } from './extension-glue/ApplicationComponents';
import { PaletteManager } from './extension-glue/PaletteManager';
import { EmptyEditorPage } from './pages/EmptyEditorPage';
import { Routes } from './Routes';

export function AppContainer() {
  const { widescreen } = useUIManagerContext();
  const { wsName, primaryWsPath, openedWsPaths } = useWorkspaceContext();
  const extensionRegistry = useExtensionRegistryContext();
  const { setEditor } = useEditorManagerContext();

  const sidebars = extensionRegistry.getSidebars();

  const { sidebar } = useUIManagerContext();
  const currentSidebar = sidebar
    ? sidebars.find((s) => s.name === sidebar)
    : null;

  const mainContent = useMemo(() => {
    const result: ReactNode[] = [];

    if (!openedWsPaths.hasSomeWsPath()) {
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
        mainContent={<Routes>{mainContent}</Routes>}
      />
      <NotificationArea />
    </>
  );
}
