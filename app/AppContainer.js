import './style/tailwind.src.css';
import './style/style.css';
import './style/prosemirror.css';
import React from 'react';
import { Editor } from './components/Editor';
import { EditorManager } from './components/EditorManager';
import { UIContextProvider } from './store/UIContext';
import { Aside } from './components/Aside/Aside';
import { PaletteContainer } from './components/PaletteContainer';
import { WorkspacePermissionModal } from './workspace/WorkspacePermissionModal';

export class AppContainer extends React.PureComponent {
  static propTypes = {};

  render() {
    return (
      <div className="h-screen main-wrapper">
        <div className="editor-wrapper">
          <WorkspacePermissionModal>
            <div className="flex justify-center flex-row">
              <EditorManager>
                {(manager, openedDocuments) =>
                  openedDocuments.map((openedDocument, i) => (
                    <div
                      key={openedDocument.key}
                      className="flex-1 max-w-screen-md ml-6 mr-6"
                      style={{ height: '100vh', overflowY: 'scroll' }}
                    >
                      <Editor
                        isFirst={i === 0}
                        docName={openedDocument.docName}
                        manager={manager}
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
              </EditorManager>
            </div>
          </WorkspacePermissionModal>
        </div>
        <UIContextProvider>
          <PaletteContainer />
          <Aside />
        </UIContextProvider>
      </div>
    );
  }
}
