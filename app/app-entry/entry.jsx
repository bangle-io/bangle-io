import './style';
import { UIManager } from 'ui-context/index';
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { EditorManager } from 'editor-manager-context/index';
import { polyfills, initExtensionRegistry } from 'shared/index';
import { WorkerSetup } from 'worker-setup/index';
import { ActionContextProvider } from 'action-context';
import { ExtensionRegistryContextProvider } from 'extension-registry/index';
import { WorkspaceContextProvider } from 'workspace-context/index';

import { PageLifecycle } from './watchers/PageLifecycle';
import App from './App';
import { moduleSupport } from './misc/module-support';
import { AppStateProvider } from './AppStateProvider';
import { WatchWorkspace } from './watchers/WatchWorkspace';
import { WatchUI } from './watchers/WatchUI';
import { handleNativefsAuthError } from './Routes';

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
            <PageLifecycle />
            <UIManager>
              <ExtensionRegistryContextProvider
                initExtensionRegistry={initExtensionRegistry}
              >
                <WorkspaceContextProvider
                  onNativefsAuthError={handleNativefsAuthError}
                >
                  <WatchWorkspace />
                  <WatchUI />
                  <EditorManager>
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
