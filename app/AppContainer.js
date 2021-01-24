import './style/tailwind.src.css';
import './style/style.css';
import './style/prosemirror.css';
import React from 'react';
import { Editor } from './components/Editor';
import { EditorManager } from './workspace2/EditorManager';
import { Aside } from './components/Aside/Aside';
import { PaletteContainer } from './components/PaletteContainer';
import { WorkspacePermissionModal } from './workspace/WorkspacePermissionModal';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import { useWorkspaceDetails } from './workspace2/Workspace';

export function AppRouter() {
  return (
    <Router>
      <Switch>
        <Route path={['/ws/:wsName']}>
          <AppContainer />
        </Route>
        <Route path="/">
          <span>Let us open a workspace</span>
        </Route>
      </Switch>
    </Router>
  );
}

export function AppContainer() {
  const { wsPath } = useWorkspaceDetails();
  return (
    <EditorManager>
      <div className="h-screen main-wrapper">
        <WorkspacePermissionModal>
          <div className="editor-wrapper">
            <div className="flex justify-center flex-row">
              <div
                className="flex-1 max-w-screen-md ml-6 mr-6"
                style={{ height: '100vh', overflowY: 'scroll' }}
              >
                {wsPath && (
                  <Editor key={wsPath} isFirst={true} docName={wsPath} />
                )}
                {/* adds white space at bottoms */}
                <div
                  style={{
                    display: 'flex',
                    flexGrow: 1,
                    height: '20vh',
                    backgroundColor: 'transparent',
                  }}
                >
                  &nbsp;
                </div>
              </div>
            </div>
          </div>
        </WorkspacePermissionModal>
        <PaletteContainer />
        <Aside />
      </div>
    </EditorManager>
  );
}
