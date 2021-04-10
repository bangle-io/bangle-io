import React, { useContext } from 'react';
import { Route } from 'react-router-dom';
import { UIManagerContext } from 'ui-context/index';
import { Workspace, resolvePath, useWorkspacePath } from 'workspace/index';
import { cx, useKeybindings } from 'utils/index';

import { Editor } from './editor/Editor';
import { Palette } from './Palette/index';
import { CloseIcon } from 'ui-components/index';
import { ActivityBar } from './components/ActivityBar';
import { FileBrowser } from './components/FileBrowser';
import { OptionsBar } from './components/OptionsBar';
import { keybindings } from 'config/index';

export function AppContainer() {
  const { widescreen, hideEditorArea } = useContext(UIManagerContext);
  const { secondaryWsPath } = useWorkspacePath();
  const secondaryEditor = widescreen && Boolean(secondaryWsPath);
  const showTabs = Boolean(secondaryEditor);

  return (
    <>
      <ActivityBar />
      <Palette />
      <LeftSidebarArea />
      {!hideEditorArea && (
        <div
          className={cx(
            'main-content',
            widescreen && 'widescreen',
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
            />
          </Route>
        </div>
      )}
    </>
  );
}

function RootHomePage() {
  return (
    <div>
      <span>Let us open a workspace</span>
    </div>
  );
}

function WorkspacePage({ secondaryEditor, showTabs }) {
  return (
    <Workspace>
      <EditorArea showTabs={false} isFirst={true} />
      <OptionsBar />
      {secondaryEditor && <div className="grid-gutter" />}
      {secondaryEditor && <EditorArea isFirst={false} showTabs={showTabs} />}
    </Workspace>
  );
}

function EditorArea({ isFirst = false, showTabs }) {
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
            key={wsPath}
            isFirst={isFirst}
            wsPath={wsPath}
            paletteType={paletteType}
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
        <CloseIcon className="h-4 w-4 cursor-pointer" />
      </button>
    </div>
  );
}

function LeftSidebarArea() {
  const { sidebar, dispatch } = useContext(UIManagerContext);
  const { widescreen } = useContext(UIManagerContext);

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

  return (
    <div
      className={`fadeInAnimation left-sidebar-area ${
        widescreen ? 'widescreen' : ''
      }`}
    >
      <div
        className="top-0 text-2xl mt-4"
        style={{
          padding: '0 15px',
        }}
      >
        {sidebarName}
      </div>
      {component}
    </div>
  );
}
