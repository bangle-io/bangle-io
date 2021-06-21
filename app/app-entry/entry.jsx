import './style';
import { UIManager } from 'ui-context/index';
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import { EditorManager } from 'editor-manager-context/index';
import { polyfills, initExtensionRegistry } from 'shared/index';
import { WorkerSetup } from 'worker-setup/index';
import { PageLifecycle } from './PageLifecycle';
import { moduleSupport } from './module-support';
import { AppState } from './AppStateProvider';
import { WorkspaceContextProvider } from 'workspace-context/index';
import { WatchWorkspace } from './WatchWorkspace';
import { WatchUI } from './WatchUI';
import { ActionContextProvider } from 'action-context';
import { ExtensionRegistryContextProvider } from 'extension-registry/index';

function LoadingBlock({ children }) {
  const [loaded, updateLoaded] = useState(() => {
    return polyfills.length === 0;
  });
  useEffect(() => {
    if (polyfills.length > 0) {
      console.debug('Polyfilling ' + polyfills.length + ' features.');
      Promise.all(polyfills).then(() => [updateLoaded(true)]);
    }
  }, []);
  return loaded ? children : null;
}

export function Entry() {
  return (
    <React.StrictMode>
      <LoadingBlock>
        <Router>
          <AppState>
            <WorkerSetup loadWebworker={moduleSupport} />
            <PageLifecycle />
            <UIManager>
              <WorkspaceContextProvider>
                <WatchWorkspace />
                <WatchUI />
                <ExtensionRegistryContextProvider
                  initExtensionRegistry={initExtensionRegistry}
                >
                  <EditorManager>
                    <ActionContextProvider>
                      <App />
                    </ActionContextProvider>
                  </EditorManager>
                </ExtensionRegistryContextProvider>
              </WorkspaceContextProvider>
            </UIManager>
          </AppState>
        </Router>
      </LoadingBlock>
    </React.StrictMode>
  );
}
