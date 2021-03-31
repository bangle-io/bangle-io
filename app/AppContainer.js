import './style/reset.css';
import './style/tailwind.src.css';
import './style/style.css';
import './style/animations.css';
import React, { useContext } from 'react';
import { Editor } from './components/Editor';
import { EditorManager, EditorManagerContext } from './editor/EditorManager';
import { LeftSidebar } from './components/LeftSidebar/LeftSidebar';
import { Palette } from './Palette/index';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import { useWorkspacePath } from './workspace/workspace-hooks';
import { Workspace } from './workspace/Workspace';
import { UIManager, UIManagerContext } from './UIManager';
import { checkWidescreen } from './misc/index';
import { useWindowSize } from './misc/hooks';

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
  const { wsPath, secondaryWsPath } = useWorkspacePath();
  const secondaryEditor = wideScreen && Boolean(secondaryWsPath);
  return (
    <div
      className={`main-content ${wideScreen ? 'wide-screen' : ''}
    ${secondaryEditor ? 'has-secondary-editor' : ''}
    `}
    >
      <Route exact path="/">
        <div>
          <span>Let us open a workspace</span>
        </div>
      </Route>
      <Route path="/ws/:wsName">
        <Workspace>
          <div className="bangle-editor-wrapper">
            <EditorWrapper
              isFirst={true}
              wsPath={wsPath}
              sendRequest={sendRequest}
              paletteType={paletteType}
            />
          </div>
          {wideScreen && secondaryEditor ? (
            <div className="bangle-editor-wrapper">
              <EditorWrapper
                isFirst={false}
                wsPath={secondaryWsPath}
                sendRequest={sendRequest}
                paletteType={paletteType}
              />
            </div>
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
