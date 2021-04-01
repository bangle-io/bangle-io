import './style/reset.css';
import './style/tailwind.src.css';
import './style/style.css';
import './style/animations.css';
import React, { useContext } from 'react';
import { Editor } from './components/Editor';
import { EditorManager, EditorManagerContext } from './editor/EditorManager';
import { LeftSidebar } from './components/LeftSidebar/LeftSidebar';
import { Palette } from './Palette/index';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import { useWorkspacePath } from './workspace/workspace-hooks';
import { Workspace } from './workspace/Workspace';
import { UIManager, UIManagerContext } from './UIManager';
import { checkWidescreen } from './misc/index';
import { useWindowSize } from './misc/hooks';
import { resolvePath } from './workspace/path-helpers';
import { CloseIcon } from './helper-ui/Icons';

export function AppContainer() {
  return (
    <Router>
      <EditorManager>
        <UIManager>
          <LeftSidebar />
          <Palette />
          <MainContent />
        </UIManager>
      </EditorManager>
    </Router>
  );
}

function MainContent() {
  const windowSize = useWindowSize();
  const wideScreen = checkWidescreen(windowSize.width);
  const { sendRequest } = useContext(EditorManagerContext);
  const { paletteType } = useContext(UIManagerContext);
  const {
    wsPath,
    secondaryWsPath,
    removeWsPath,
    removeSecondaryWsPath,
  } = useWorkspacePath();

  const secondaryEditor = wideScreen && Boolean(secondaryWsPath);

  return (
    <div
      className={`main-content ${
        secondaryEditor ? 'has-secondary-editor' : ''
      }`}
    >
      <Route exact path="/">
        <div>
          <span>Let us open a workspace</span>
        </div>
      </Route>
      <Route path="/ws/:wsName">
        <Workspace>
          <div className="bangle-editor-area">
            {secondaryEditor ? (
              <Tab wsPath={wsPath} onClose={removeWsPath} />
            ) : null}
            <div className="bangle-editor-container">
              <EditorWrapper
                isFirst={true}
                wsPath={wsPath}
                sendRequest={sendRequest}
                paletteType={paletteType}
              />
            </div>
          </div>
          {secondaryEditor ? (
            <>
              <div className="grid-gutter" />
              <div className="bangle-editor-area">
                <Tab wsPath={secondaryWsPath} onClose={removeSecondaryWsPath} />
                <div className="bangle-editor-container">
                  <EditorWrapper
                    isFirst={false}
                    wsPath={secondaryWsPath}
                    sendRequest={sendRequest}
                    paletteType={paletteType}
                  />
                </div>
              </div>
            </>
          ) : null}
        </Workspace>
      </Route>
    </div>
  );
}

function EditorWrapper(props) {
  // key to wsPath so that we remount the component on path change
  return props.wsPath ? <Editor key={props.wsPath} {...props} /> : null;
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
