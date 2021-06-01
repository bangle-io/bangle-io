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
import { Palette, WORKSPACE_PALETTE } from 'palettes/index';
import { ActivityBar } from './components/ActivityBar';
import { FileBrowser } from './components/FileBrowser';
import { OptionsBar } from './components/OptionsBar';
import { keybindings } from 'config/index';
import { EditorArea } from './editor/EditorArea';
import { EditorWrapperUI } from './components/EditorWrapperUI';
import { NotificationArea } from './components/NotificationArea';
import { HelpWorkspaceMonitor } from './help-docs/HelpWorkspaceModified';
import { HelpBrowser } from './components/HelpBrowser';

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
          {/* Show the default landing page at root */}
          <WorkspacePage
            showTabs={showTabs}
            secondaryEditor={secondaryEditor}
            widescreen={widescreen}
          />
        </Route>
        <Route path="/ws/:wsName">
          <WorkspacePage
            showTabs={showTabs}
            secondaryEditor={secondaryEditor}
            widescreen={widescreen}
          />
        </Route>
      </div>
      <NotificationArea />
    </>
  );
}

function WorkspacePage({ widescreen, secondaryEditor, showTabs }) {
  let { wsPath, secondaryWsPath, removeWsPath, removeSecondaryWsPath } =
    useWorkspacePath();
  const { paletteType, dispatch } = useContext(UIManagerContext);

  return (
    <Workspace
      renderPermission={({ permissionDenied, requestFSPermission, wsName }) => (
        <PermissionModal
          isPaletteActive={Boolean(paletteType)}
          permissionDenied={permissionDenied}
          requestFSPermission={requestFSPermission}
          wsName={wsName}
        />
      )}
      renderNotFound={({ wsName }) => {
        return (
          <EditorWrapperUI>
            <h3 className="text-xl sm:text-3xl lg:text-3xl leading-none font-bold  mb-8">
              🕵️‍♀️‍ Workspace "{wsName}" was not found
            </h3>
            <button
              onClick={() => {
                dispatch({
                  type: 'UI/CHANGE_PALETTE_TYPE',
                  value: {
                    type: WORKSPACE_PALETTE,
                  },
                });
              }}
              className="w-full mt-6 sm:w-auto flex-none bg-gray-800 hover:bg-purple-600 text-white text-lg leading-6 font-semibold py-3 px-6 border border-transparent rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-900 focus:outline-none transition-colors duration-200"
            >
              Open something else?
            </button>
          </EditorWrapperUI>
        );
      }}
    >
      <EditorArea
        className="primary-editor"
        editorId={0}
        showTabs={false}
        wsPath={wsPath}
        onClose={removeWsPath}
      />

      {wsPath && <HelpWorkspaceMonitor wsPath={wsPath} />}
      {secondaryWsPath && <HelpWorkspaceMonitor wsPath={secondaryWsPath} />}
      {widescreen && <OptionsBar />}
      {widescreen && secondaryEditor && <div className="grid-gutter" />}
      {widescreen && secondaryEditor && (
        <EditorArea
          className="secondary-editor fadeInAnimation"
          editorId={1}
          showTabs={showTabs}
          wsPath={secondaryWsPath}
          onClose={removeSecondaryWsPath}
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

    case 'help-browser': {
      sidebarName = 'Help';
      component = <HelpBrowser />;
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
        <div className="top-0 text-2xl mt-4 px-4 mb-2">{sidebarName}</div>
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

function PermissionModal({
  isPaletteActive,
  permissionDenied,
  requestFSPermission,
  wsName,
}) {
  useEffect(() => {
    let callback = keybindingsHelper({
      Enter: () => {
        if (isPaletteActive) {
          return false;
        }
        requestFSPermission();
        return true;
      },
    });
    document.addEventListener('keydown', callback);
    return () => {
      document.removeEventListener('keydown', callback);
    };
  }, [requestFSPermission, isPaletteActive]);

  return (
    <EditorWrapperUI>
      <div className="flex flex-grow justify-center flex-col cursor-pointer">
        <h3 className="text-xl sm:text-3xl lg:text-3xl leading-none font-bold  mb-8">
          👩‍💻 Bangle.io needs your permission to read "{wsName}"
        </h3>
        <span className="flex-shrink text-lg sm:leading-10 font-semibold mb-10 sm:mb-1">
          {permissionDenied &&
            'You have denied bangle.io permission to access your workspace.'}
        </span>
        <button
          onClick={() => {
            requestFSPermission();
          }}
          className="w-full mt-6 sm:w-auto flex-none bg-gray-800 hover:bg-purple-600 text-white text-lg leading-6 font-semibold py-3 px-6 border border-transparent rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-900 focus:outline-none transition-colors duration-200"
        >
          Press <kbd>Enter</kbd> or 👆click this grant permission.
        </button>
      </div>
    </EditorWrapperUI>
  );
}
