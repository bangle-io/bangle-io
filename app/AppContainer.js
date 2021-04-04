import React, { useContext } from 'react';
import { Route } from 'react-router-dom';
import { UIManagerContext } from 'ui-context/index';
import { Workspace, resolvePath, useWorkspacePath } from 'workspace/index';
import { useKeybindings } from 'utils/index';

import { Editor } from './components/Editor';
import { EditorManagerContext } from './editor/EditorManager';
import { Palette } from './Palette/index';
import { CloseIcon } from './helper-ui/Icons';
import { ActivityBar } from './components/LeftSidebar/ActivityBar';
import { FileBrowser } from './components/LeftSidebar/FileBrowser';

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
          className={`main-content ${widescreen ? 'widescreen' : ''}
          ${secondaryEditor ? 'has-secondary-editor' : ''}`}
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
      <EditorArea showTabs={showTabs} isFirst={true} />
      {secondaryEditor && <div className="grid-gutter" />}
      {secondaryEditor && <EditorArea isFirst={false} showTabs={showTabs} />}
    </Workspace>
  );
}

function EditorArea({ isFirst = false, showTabs }) {
  const { sendRequest } = useContext(EditorManagerContext);
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
    <div className="bangle-editor-area">
      {wsPath && showTabs ? <Tab wsPath={wsPath} onClose={onClose} /> : null}
      <div className="bangle-editor-container">
        {wsPath && (
          <Editor
            key={wsPath}
            isFirst={isFirst}
            wsPath={wsPath}
            sendRequest={sendRequest}
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
      'Mod-e': () => {
        dispatch({
          type: 'UI/TOGGLE_SIDEBAR',
          value: { type: 'file-browser' },
        });
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
      <div className="top-0 text-2xl pb-1 pl-3">{sidebarName}</div>
      {component}
    </div>
  );
}
