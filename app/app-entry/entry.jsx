import './style';
import { UIManager } from 'ui-context';
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { EditorManager } from 'editor-manager-context';
import { polyfills, initExtensionRegistry } from 'shared';
import { WorkerSetup } from 'worker-setup';
import { ActionContextProvider } from 'action-context';
import { ExtensionRegistryContextProvider } from 'extension-registry';
import { WorkspaceContextProvider } from 'workspace-context';

import { PageLifecycle } from './watchers/PageLifecycle';
import App from './App';
import { moduleSupport } from './misc/module-support';
import { AppStateProvider } from './AppStateProvider';
import { WatchWorkspace } from './watchers/WatchWorkspace';
import { WatchUI } from './watchers/WatchUI';
import { handleNativefsAuthError, handleWorkspaceNotFound } from './Routes';

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
              </ExtensionRegistryContextProvider>
            </UIManager>
          </AppStateProvider>
        </Router>
      </LoadingBlock>
    </React.StrictMode>
  );
}
