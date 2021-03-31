import './style/reset.css';
import './style/tailwind.src.css';
import './style/style.css';
import './style/animations.css';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { Editor } from './components/Editor';
import { EditorManager } from './editor/EditorManager';
import { LeftSidebar } from './components/LeftSidebar/LeftSidebar';
import { Palette } from './Palette/index';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import { useWorkspacePath } from './workspace/workspace-hooks';
import { Workspace } from './workspace/Workspace';
import { UIManager } from './UIManager';
import { checkWidescreen } from './misc/index';
import { useWindowSize } from './misc/hooks';

export function AppContainer() {
  return (
    <Router>
      <EditorManager>
        <UIManager>
          <Route path={['/', '/ws/:wsName']}>
            <LeftSidebar />
            <Palette />
            <MainContent />
          </Route>
        </UIManager>
      </EditorManager>
    </Router>
  );
}

function MainContent() {
  const windowSize = useWindowSize();
  const wideScreen = checkWidescreen(windowSize.width);
  return (
    <div className={`main-content ${wideScreen ? 'wide-screen' : ''}`}>
      <Switch>
        <Route path="/ws/:wsName">
          <Workspace>
            <PrimaryEditor />
            {wideScreen ? <SecondaryEditor /> : null}
          </Workspace>
        </Route>
        <Route path="/">
          <div>
            <span>Let us open a workspace</span>
          </div>
        </Route>
      </Switch>
    </div>
  );
}

function PrimaryEditor() {
  const { wsPath } = useWorkspacePath();
  return wsPath ? <Editor key={wsPath} isFirst={true} wsPath={wsPath} /> : null;
}

function SecondaryEditor() {
  const { secondaryWsPath: wsPath } = useWorkspacePath();
  return wsPath ? (
    <Editor key={wsPath} isFirst={false} wsPath={wsPath} />
  ) : null;
}
