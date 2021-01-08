import './style/tailwind.src.css';
import './style/style.css';
import './style/prosemirror.css';
import React from 'react';
import { Editor } from './components/Editor';
import {
  EditorManager,
  EditorManagerContext,
} from './workspace2/EditorManager';
import { Aside } from './components/Aside/Aside';
import { PaletteContainer } from './components/PaletteContainer';
import { WorkspacePermissionModal } from './workspace/WorkspacePermissionModal';

export function AppContainer() {
  return (
    <EditorManager>
      <div className="h-screen main-wrapper">
        <WorkspacePermissionModal>
          <div className="editor-wrapper">
            <div className="flex justify-center flex-row">
              <EditorManagerContext.Consumer>
                {({ editorManagerState }) =>
                  editorManagerState.openedDocs.map((openedDocument, i) => (
                    <div
                      key={openedDocument.key}
                      className="flex-1 max-w-screen-md ml-6 mr-6"
                      style={{ height: '100vh', overflowY: 'scroll' }}
                    >
                      <Editor
                        isFirst={i === 0}
                        docName={openedDocument.wsPath}
                      />
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
                  ))
                }
              </EditorManagerContext.Consumer>
            </div>
          </div>
        </WorkspacePermissionModal>
        <PaletteContainer />
        <Aside />
      </div>
    </EditorManager>
  );
}
