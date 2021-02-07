import './style/tailwind.src.css';
import './style/style.css';
import './style/prosemirror.css';
import React from 'react';
import { Editor } from './components/Editor';
import { EditorManager } from './editor/EditorManager';
import { Aside } from './components/Aside/Aside';
import { PaletteContainer } from './components/PaletteContainer';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import { useWorkspaceDetails } from './workspace2/workspace-hooks';
import { UIManager } from './ui/UIManager';
import { Workspace } from './workspace2/Workspace';

export function AppContainer() {
  return (
    <Router>
      <UIManager>
        <Switch>
          <Route path={['/ws/:wsName']}>
            <Workspace>
              <EditorManager>
                <div className="h-screen main-wrapper">
                  <div className="editor-wrapper">
                    <div className="flex justify-center flex-row">
                      <div
                        className="flex-1 max-w-screen-md ml-6 mr-6"
                        style={{ height: '100vh', overflowY: 'scroll' }}
                      >
                        <PrimaryEditor />
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
                  <PaletteContainer />
                  <Aside />
                </div>
              </EditorManager>
            </Workspace>
          </Route>
          <Route path="/">
            <div className="h-screen main-wrapper">
              <span>Let us open a workspace</span>
              <PaletteContainer />
              <Aside />
            </div>
          </Route>
        </Switch>
      </UIManager>
    </Router>
  );
}

function PrimaryEditor() {
  const { wsPath } = useWorkspaceDetails();

  return wsPath ? (
    <Editor key={wsPath} isFirst={true} docName={wsPath} />
  ) : null;
}
