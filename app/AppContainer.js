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

function RootHomePage() {
  const { dispatch } = useContext(UIManagerContext);
  return (
    <div className="flex flex-col justify-center align-middle w-8/12 overflow-y-auto homepage">
      <h3 className="text-3xl sm:text-5xl lg:text-6xl leading-none font-extrabold tracking-tight mb-8">
        bangle.io<sup className="font-light">alpha</sup>
      </h3>

      <ul className="list-inside list-disc my-2">
        <li className="text-lg sm:text-2xl sm:leading-10 font-medium mb-10 sm:mb-1">
          A fully <span className="font-bold">local</span> Markdown Editor - no
          servers.
        </li>
        <li className="text-lg sm:text-2xl sm:leading-10 font-medium mb-10 sm:mb-1">
          WYSIWG editor that edits markdown files saved in your hard drive*
        </li>
        <li className="text-lg sm:text-2xl sm:leading-10 font-medium mb-10 sm:mb-1">
          You own your data, nothing leaves your computer.
        </li>
      </ul>

      <button
        onClick={() => {
          dispatch({
            type: 'UI/CHANGE_PALETTE_TYPE',
            value: { type: COMMAND_PALETTE, initialQuery: 'workspace ' },
          });
        }}
        className="w-full mt-6 sm:w-auto flex-none bg-gray-800 hover:bg-pink-600 text-white text-lg leading-6 font-semibold py-3 px-6 border border-transparent rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-900 focus:outline-none transition-colors duration-200"
      >
        Open a local directory with markdown content^
      </button>

      <button
        onClick={() => {
          dispatch({
            type: 'UI/CHANGE_PALETTE_TYPE',
            value: { type: COMMAND_PALETTE, initialQuery: 'import workspace' },
          });
        }}
        className="w-full mt-6 sm:w-auto flex-none bg-gray-800 hover:bg-purple-600 text-white text-lg leading-6 font-semibold py-3 px-6 border border-transparent rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-900 focus:outline-none transition-colors duration-200"
      >
        Open a public Github repo with markdown content
      </button>

      <ul className="list-inside list-disc my-2">
        After opening a workspace use:
        <li className="text-lg sm:leading-10 font-medium mb-10 sm:mb-1">
          Press <kbd>{keybindings.toggleFilePalette.displayValue}</kbd> for File
          Palette
        </li>
        <li className="text-lg sm:leading-10 font-medium mb-10 sm:mb-1">
          Press <kbd>{keybindings.toggleCommandPalette.displayValue}</kbd> for
          Command Palette
        </li>
      </ul>
      <p className="text-base my-2 text-sm font-semibold">
        * Only available on Chrome and Edge
      </p>
      <p className="text-base my-2 text-sm font-semibold">
        ^Please backup your data using a vcs like Git before using it.
      </p>
      <p className="text-base mt-3 my-2 text-lg font-semibold align-middle">
        This is still WIP, for Issues/thoughts/❤️ please visit{' '}
        <a
          target="_blank"
          rel="noreferrer"
          className="text-indigo-500 font-extrabold hover:underline"
          href="https://github.com/bangle-io/bangle-io-issues"
        >
          Github
        </a>
      </p>
    </div>
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
