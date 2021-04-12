import React, { useContext } from 'react';
import { Route } from 'react-router-dom';
import { UIManagerContext } from 'ui-context/index';
import { Workspace, resolvePath, useWorkspacePath } from 'workspace/index';
import { cx, useKeybindings, useWatchClickOutside } from 'utils/index';

import { Editor } from './editor/Editor';
import { Palette } from './Palette/index';
import { CloseIcon } from 'ui-components/index';
import { ActivityBar } from './components/ActivityBar';
import { FileBrowser } from './components/FileBrowser';
import { OptionsBar } from './components/OptionsBar';
import { keybindings } from 'config/index';

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
  return (
    <div className="flex flex-col justify-center align-middle">
      <button className="block">Let us open a workspace</button>
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
  const { paletteType } = useContext(UIManagerContext);

  let {
    wsPath,
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
        {wsPath && (
          <Editor
            // Key is used to reload the editor when wsPath changes
            key={wsPath}
            isFirst={isFirst}
            wsPath={wsPath}
            // whenever paletteType goes undefined focus back on editor
            grabFocus={widescreen && isFirst && paletteType == null}
          />
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

  return (
    <div
      ref={leftSidebarAreaRef}
      className={`fadeInAnimation left-sidebar-area smallscreen shadow-lg`}
    >
      <div className="overflow-y-auto">{component}</div>
    </div>
  );
}
