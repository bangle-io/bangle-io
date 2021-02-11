import './style/tailwind.src.css';
import './style/style.css';
import './style/prosemirror.css';
import React from 'react';
import { Editor } from './components/Editor';
import { EditorManager } from './editor/EditorManager';
import { Aside } from './components/Aside/Aside';
import { PaletteContainer } from './components/Palettes/PaletteContainer';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import { useWorkspacePath } from './workspace/workspace-hooks';
import { Workspace } from './workspace/Workspace';
import { UIManager } from './ui/UIManager';

export function AppContainer() {
  return (
    <Router>
      <UIManager>
        <Switch>
          <Route path={['/ws/:wsName']}>
            <div className="h-screen main-wrapper">
              <div className="editor-wrapper">
                <div className="flex justify-center flex-row">
                  <div
                    className="flex-1 max-w-screen-md ml-6 mr-6"
                    style={{ height: '100vh', overflowY: 'scroll' }}
                  >
                    <Workspace>
                      <EditorManager>
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
                      </EditorManager>
                    </Workspace>
                  </div>
                </div>
              </div>
              <PaletteContainer />
              <Aside />
            </div>
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
  const { wsPath } = useWorkspacePath();

  return wsPath ? (
    <Editor key={wsPath} isFirst={true} docName={wsPath} />
  ) : null;
}
