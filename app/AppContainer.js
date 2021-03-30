import './style/reset.css';
import './style/tailwind.src.css';
import './style/style.css';
import './style/animations.css';
import React from 'react';
import { Editor } from './components/Editor';
import { EditorManager } from './editor/EditorManager';
import { LeftSidebar } from './components/LeftSidebar/LeftSidebar';
import { Palette } from './Palette/index';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import { useWorkspacePath } from './workspace/workspace-hooks';
import { Workspace } from './workspace/Workspace';
import { UIManager } from './UIManager';

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
  return (
    <div className="main-content">
      <Switch>
        <Route path="/ws/:wsName">
          <Workspace>
            <PrimaryEditor />
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
