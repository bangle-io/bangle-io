import React, { useContext } from 'react';
import { Route } from 'react-router-dom';
import { UIManagerContext } from 'ui-context/index';
import { Workspace, resolvePath, useWorkspacePath } from 'workspace/index';
import { cx, useKeybindings, useWatchClickOutside } from 'utils/index';
import { Editor } from './editor/Editor';
import { COMMAND_PALETTE, FILE_PALETTE, Palette } from './Palette/index';
import { CloseIcon } from 'ui-components/index';
import { ActivityBar } from './components/ActivityBar';
import { FileBrowser } from './components/FileBrowser';
import { OptionsBar } from './components/OptionsBar';
import { keybindings, keyDisplayValue } from 'config/index';

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
  return (
    <Workspace>
      <EditorArea showTabs={false} isFirst={true} widescreen={widescreen} />
      {widescreen && <OptionsBar />}
      {widescreen && secondaryEditor && <div className="grid-gutter" />}
      {widescreen && secondaryEditor && (
        <EditorArea
          isFirst={false}
          showTabs={showTabs}
          widescreen={widescreen}
        />
      )}
    </Workspace>
  );
}

function EditorArea({ isFirst = false, showTabs, widescreen }) {
  const { paletteType, dispatch } = useContext(UIManagerContext);

  let {
    wsPath,
    wsName,
    secondaryWsPath,
    removeWsPath,
    removeSecondaryWsPath,
  } = useWorkspacePath();

  let onClose = removeWsPath;

  if (!isFirst) {
    wsPath = secondaryWsPath;
    onClose = removeSecondaryWsPath;
  }

  return (
    <div
      className={cx(
        'bangle-editor-area',
        isFirst ? 'primary-editor' : 'secondary-editor fadeInAnimation',
      )}
    >
      {wsPath && showTabs ? <Tab wsPath={wsPath} onClose={onClose} /> : null}
      <div className={cx('bangle-editor-container', showTabs && 'has-tabs')}>
        {wsPath ? (
          <Editor
            // Key is used to reload the editor when wsPath changes
            key={wsPath}
            isFirst={isFirst}
            wsPath={wsPath}
            // whenever paletteType goes undefined focus back on editor
            grabFocus={widescreen && isFirst && paletteType == null}
          />
        ) : (
          <>
            <button
              onClick={() => {
                dispatch({
                  type: 'UI/CHANGE_PALETTE_TYPE',
                  value: { type: FILE_PALETTE },
                });
              }}
              className="w-full mt-6 sm:w-auto flex-none bg-gray-800 hover:bg-gray-600 text-white text-lg leading-6 font-semibold py-3 px-6 border border-transparent rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-900 focus:outline-none transition-colors duration-200"
            >
              Open a file
            </button>
            <button
              onClick={() => {
                dispatch({
                  type: 'UI/CHANGE_PALETTE_TYPE',
                  value: { type: COMMAND_PALETTE, initialQuery: 'new file' },
                });
              }}
              className="ml-3 w-full mt-6 sm:w-auto flex-none bg-gray-800 hover:bg-gray-600 text-white text-lg leading-6 font-semibold py-3 px-6 border border-transparent rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-900 focus:outline-none transition-colors duration-200"
            >
              Create a file
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Tab({ wsPath, onClose }) {
  return (
    <div className="editor-tab">
      <span>{resolvePath(wsPath).fileName}</span>
      <button type="button" onClick={onClose} className={`focus:outline-none`}>
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
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
