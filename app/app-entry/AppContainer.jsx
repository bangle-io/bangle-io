import React, { useMemo, useContext } from 'react';
import { UIManagerContext } from 'ui-context/index';
import { cx, useKeybindings, useWatchClickOutside } from 'utils/index';
import { ActivityBar } from './components/ActivityBar';
import { FileBrowser } from './components/FileBrowser';
import { keybindings } from 'config/index';
import { NotificationArea } from './components/NotificationArea';
import { HelpBrowser } from './components/HelpBrowser';
import { PRIMARY_SCROLL_PARENT_ID } from 'constants/index';
import { ApplicationComponents } from './extension-glue/ApplicationComponents';
import { useWorkspaceContext } from 'workspace-context/index';
import { PaletteManager } from './extension-glue/PaletteManager';
import { Routes } from './Routes';
import { ExtensionRegistryContext } from 'extension-registry';

export function AppContainer() {
  const { widescreen } = useContext(UIManagerContext);
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
  const { sidebar, dispatch } = useContext(UIManagerContext);
  const { widescreen } = useContext(UIManagerContext);
  const extensionRegistry = useContext(ExtensionRegistryContext);

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

  useKeybindings(() => {
    const keys = Object.fromEntries(
      extensionRegistry
        .getSidebars()
        .filter((r) => r.keybinding)
        .map((r) => [
          r.keybinding.key,
          () => {
            dispatch({
              type: 'UI/TOGGLE_SIDEBAR',
              value: { type: r.name },
            });
            return true;
          },
        ]),
    );

    console.log(keys);
    return {
      [keybindings.toggleFileBrowser.key]: () => {
        dispatch({
          type: 'UI/TOGGLE_SIDEBAR',
          value: { type: 'file-browser' },
        });
        return true;
      },
      ...keys,
    };
  }, [dispatch, extensionRegistry]);

  const extensionSidebars = useMemo(() => {
    return Object.fromEntries(
      extensionRegistry.getSidebars().map((r) => [r.name, r]),
    );
  }, [extensionRegistry]);

  let sidebarName, component;
  if (extensionSidebars[sidebar]) {
    const sidebarObj = extensionSidebars[sidebar];
    component = <sidebarObj.ReactComponent />;
  } else {
    switch (sidebar) {
      case 'file-browser': {
        component = <FileBrowser />;
        break;
      }

      case 'help-browser': {
        component = <HelpBrowser />;
        break;
      }

      default: {
        return null;
      }
    }
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
