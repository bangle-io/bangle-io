import './style/tailwind.src.css';
import './style/style.css';
import './style/prosemirror.css';
import React from 'react';
import { Editor } from './components/Editor';
import { EditorManager } from './editor/EditorManager';
import { Aside } from './components/Aside/Aside';
import { PaletteContainer } from './Palette/Palettes/PaletteContainer';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import { useWorkspacePath } from './workspace/workspace-hooks';
import { Workspace } from './workspace/Workspace';
import { UIManager } from './UIManager';
import { PaletteContextProvider } from './Palette/index';

export function AppContainer() {
  return (
    <EditorManager>
      <PaletteContextProvider>
        <Router>
          <UIManager>
            <Switch>
              <Route path={['/ws/:wsName']}>
                <div className="h-screen main-wrapper">
                  <div className="editor-wrapper">
                    <div className="flex justify-center flex-row">
                      <div
                        className="flex-1 max-w-screen-md ml-1 mr-1"
                        style={{ height: '100vh', overflowY: 'scroll' }}
                      >
                        <Workspace>
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
      </PaletteContextProvider>
    </EditorManager>
  );
}

function PrimaryEditor() {
  const { wsPath } = useWorkspacePath();

  return wsPath ? <Editor key={wsPath} isFirst={true} wsPath={wsPath} /> : null;
}
