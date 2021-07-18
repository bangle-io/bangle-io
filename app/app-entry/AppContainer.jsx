import { PRIMARY_SCROLL_PARENT_ID } from 'constants';
import { useExtensionRegistryContext } from 'extension-registry';
import React, { useMemo } from 'react';
import { ErrorBoundary } from 'ui-components';
import { useUIManagerContext } from 'ui-context';
import { cx } from 'utils';
import { useWorkspaceContext } from 'workspace-context';
import { Changelog } from './changelog/Changelog';
import { ActivityBar } from './components/ActivityBar';
import { NotificationArea } from './components/NotificationArea';
import { ApplicationComponents } from './extension-glue/ApplicationComponents';
import { PaletteManager } from './extension-glue/PaletteManager';
import { Routes } from './Routes';

export function AppContainer() {
  const { widescreen } = useUIManagerContext();
  const { secondaryWsPath } = useWorkspaceContext();
  const secondaryEditor = widescreen && Boolean(secondaryWsPath);

  return (
    <>
      <Changelog />
      <ApplicationComponents />
      <ActivityBar />
      <PaletteManager />
      <LeftSidebarArea />
      <div
        id={cx(widescreen && !secondaryEditor && PRIMARY_SCROLL_PARENT_ID)}
        className={cx(
          'main-content',
          widescreen ? 'widescreen' : 'smallscreen',
          secondaryEditor && 'has-secondary-editor',
        )}
      >
        <Routes />
      </div>
      <NotificationArea />
    </>
  );
}

function LeftSidebarArea() {
  const { widescreen, sidebar } = useUIManagerContext();
  const extensionRegistry = useExtensionRegistryContext();

  const extensionSidebars = useMemo(() => {
    return Object.fromEntries(
      extensionRegistry.getSidebars().map((r) => [r.name, r]),
    );
  }, [extensionRegistry]);

  let component;
  if (extensionSidebars[sidebar]) {
    const sidebarObj = extensionSidebars[sidebar];
    component = <sidebarObj.ReactComponent />;
  } else {
    return null;
  }

  if (widescreen) {
    return (
      <div className="fadeInAnimation left-sidebar-area widescreen">
        <ErrorBoundary>{component}</ErrorBoundary>
      </div>
    );
  }

  return null;
}
