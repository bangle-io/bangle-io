import { ActionContextProvider } from 'action-context';
import { EditorManager } from 'editor-manager-context';
import {
  ExtensionRegistryContextProvider,
  ExtensionStateContextProvider,
} from 'extension-registry';
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { initExtensionRegistry, polyfills } from 'shared';
import { UIManager } from 'ui-context';
import { WorkerSetup } from 'worker-setup';
import { WorkspaceContextProvider } from 'workspace-context';
import App from './App';
import { AppStateProvider } from './AppStateProvider';
import { moduleSupport } from './misc/module-support';
import { handleNativefsAuthError, handleWorkspaceNotFound } from './Routes';
import './style';
import { PageLifecycle } from './watchers/PageLifecycle';
import { WatchUI } from './watchers/WatchUI';
import { WatchWorkspace } from './watchers/WatchWorkspace';

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
          <AppStateProvider>
            <WorkerSetup loadWebworker={moduleSupport} />
            <UIManager>
              <ExtensionRegistryContextProvider
                initExtensionRegistry={initExtensionRegistry}
              >
                <ExtensionStateContextProvider>
                  <WorkspaceContextProvider
                    onNativefsAuthError={handleNativefsAuthError}
                    onWorkspaceNotFound={handleWorkspaceNotFound}
                  >
                    <WatchWorkspace />
                    <WatchUI />
                    <EditorManager>
                      <PageLifecycle />
                      <ActionContextProvider>
                        <App />
                      </ActionContextProvider>
                    </EditorManager>
                  </WorkspaceContextProvider>
                </ExtensionStateContextProvider>
              </ExtensionRegistryContextProvider>
            </UIManager>
          </AppStateProvider>
        </Router>
      </LoadingBlock>
    </React.StrictMode>
  );
}
