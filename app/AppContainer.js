import React, { useContext, useEffect } from 'react';
import { Route } from 'react-router-dom';
import { UIManagerContext } from 'ui-context/index';
import { Workspace, useWorkspacePath } from 'workspace/index';
import {
  cx,
  keybindingsHelper,
  useKeybindings,
  useWatchClickOutside,
} from 'utils/index';
import { COMMAND_PALETTE, Palette } from './Palette/index';
import { ActivityBar } from './components/ActivityBar';
import { FileBrowser } from './components/FileBrowser';
import { OptionsBar } from './components/OptionsBar';
import { keybindings } from 'config/index';
import { EditorArea } from './editor/EditorArea';
import { RootHomePage } from './components/RootHomePage';

export function AppContainer() {
  const { widescreen } = useContext(UIManagerContext);
  const { secondaryWsPath } = useWorkspacePath();
  const secondaryEditor = widescreen && Boolean(secondaryWsPath);
  const showTabs = Boolean(secondaryEditor);

  return (
    <>
      <ActivityBar />
      <Palette />
      <LeftSidebarArea />
      <div
        className={cx(
          'main-content',
          widescreen ? 'widescreen' : 'smallscreen',
          secondaryEditor && 'has-secondary-editor',
        )}
      >
        <Route exact path="/">
          <RootHomePage />
        </Route>
        <Route path="/ws/:wsName">
          <WorkspacePage
            showTabs={showTabs}
            secondaryEditor={secondaryEditor}
            widescreen={widescreen}
          />
        </Route>
      </div>
    </>
  );
}

function WorkspacePage({ widescreen, secondaryEditor, showTabs }) {
  let {
    wsPath,
    secondaryWsPath,
    removeWsPath,
    removeSecondaryWsPath,
  } = useWorkspacePath();
  const { paletteType } = useContext(UIManagerContext);

  const primaryGrabFocus = widescreen && paletteType == null;
  const secondaryGrabFocus = false;

  return (
    <Workspace
      renderPermissionModal={({
        permissionDenied,
        requestFSPermission,
        wsName,
      }) => (
        <PermissionModal
          permissionDenied={permissionDenied}
          requestFSPermission={requestFSPermission}
          wsName={wsName}
        />
      )}
    >
      <EditorArea
        className="primary-editor"
        editorId={0}
        showTabs={false}
        wsPath={wsPath}
        onClose={removeWsPath}
        grabFocus={primaryGrabFocus}
      />
      {widescreen && <OptionsBar />}
      {widescreen && secondaryEditor && <div className="grid-gutter" />}
      {widescreen && secondaryEditor && (
        <EditorArea
          className="secondary-editor fadeInAnimation"
          editorId={1}
          isFirst={false}
          showTabs={showTabs}
          widescreen={widescreen}
          wsPath={secondaryWsPath}
          onClose={removeSecondaryWsPath}
          grabFocus={secondaryGrabFocus}
        />
      )}
    </Workspace>
  );
}

function LeftSidebarArea() {
  const { sidebar, dispatch } = useContext(UIManagerContext);
  const { widescreen } = useContext(UIManagerContext);

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
    return {
      [keybindings.toggleFileBrowser.key]: () => {
        dispatch({
          type: 'UI/TOGGLE_SIDEBAR',
          value: { type: 'file-browser' },
        });
        return true;
      },
    };
  }, [dispatch]);

  let sidebarName, component;

  switch (sidebar) {
    case 'file-browser': {
      sidebarName = 'Files';
      component = <FileBrowser />;
      break;
    }

    default: {
      return null;
    }
  }

  if (widescreen) {
    return (
      <div
        ref={leftSidebarAreaRef}
        className="fadeInAnimation left-sidebar-area widescreen"
      >
        <div className="top-0 text-2xl mt-4 px-4">{sidebarName}</div>
        {component}
      </div>
    );
  }

  return null;

  return (
    <div
      ref={leftSidebarAreaRef}
      className={`fadeInAnimation left-sidebar-area smallscreen shadow-lg`}
    >
      <div className="overflow-y-auto">{component}</div>
    </div>
  );
}

function PermissionModal({ permissionDenied, requestFSPermission, wsName }) {
  useEffect(() => {
    let callback = keybindingsHelper({
      Enter: () => {
        requestFSPermission();
        return true;
      },
    });
    document.addEventListener('keydown', callback);
    return () => {
      document.removeEventListener('keydown', callback);
    };
  }, [requestFSPermission]);

  return (
    <div
      className="flex justify-center flex-col h-full align-middle cursor-pointer"
      onClick={() => requestFSPermission()}
    >
      <span className="flex-shrink text-lg sm:leading-10 font-semibold mb-10 sm:mb-1">
        {permissionDenied &&
          `You have denied bangle.io permission to access your workspace.`}
      </span>
      <span className="flex-shrink text-lg sm:leading-10 font-medium  mb-10 sm:mb-1">
        Press Enter or click anywhere to grant permission and resume working on
        "{wsName}"
      </span>
    </div>
  );
}
