import React, { useMemo, useContext } from 'react';
import { useUIManagerContext } from 'ui-context';
import { cx, useWatchClickOutside } from 'utils';
import { ActivityBar } from './components/ActivityBar';
import { NotificationArea } from './components/NotificationArea';
import { PRIMARY_SCROLL_PARENT_ID } from 'constants';
import { ApplicationComponents } from './extension-glue/ApplicationComponents';
import { useWorkspaceContext } from 'workspace-context';
import { PaletteManager } from './extension-glue/PaletteManager';
import { Routes } from './Routes';
import { useExtensionRegistryContext } from 'extension-registry';

export function AppContainer() {
  const { widescreen } = useUIManagerContext();
  const { secondaryWsPath } = useWorkspaceContext();
  const secondaryEditor = widescreen && Boolean(secondaryWsPath);

  return (
    <>
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
  const { widescreen, sidebar, dispatch } = useUIManagerContext();
  const extensionRegistry = useExtensionRegistryContext();

  const leftSidebarAreaRef = useWatchClickOutside(
    () => {
      if (!widescreen && sidebar) {
        dispatch({
          type: 'UI/CHANGE_SIDEBAR',
          value: { type: null },
        });
      }
    },
    () => {},
  );

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
      <div
        ref={leftSidebarAreaRef}
        className="fadeInAnimation left-sidebar-area widescreen"
      >
        {component}
      </div>
    );
  }

  return null;
}
