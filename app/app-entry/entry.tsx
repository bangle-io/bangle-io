import './style';

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import { ActionContextProvider } from '@bangle.io/action-context';
import { EditorManager } from '@bangle.io/editor-manager-context';
import {
  ExtensionRegistryContextProvider,
  ExtensionStateContextProvider,
} from '@bangle.io/extension-registry';
import { initExtensionRegistry, polyfills } from '@bangle.io/shared';
import { UIManager } from '@bangle.io/ui-context';
import { WorkerSetup } from '@bangle.io/worker-setup';
import { WorkspaceContextProvider } from '@bangle.io/workspace-context';

import {
  AppContainer,
  handleNativefsAuthError,
  handleWorkspaceNotFound,
} from './AppContainer';
import { AppStateProvider } from './AppStateProvider';
import { moduleSupport } from './misc/module-support';
import { SWReloadPrompt } from './service-worker/SWReloadPrompt';
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
  useEffect(() => {
    const installCallback = (event: BeforeInstallPromptEvent) => {
      // not show infobar on mobile
      event.preventDefault();
    };
    window.addEventListener('beforeinstallprompt', installCallback);
    return () => {
      window.removeEventListener('beforeinstallprompt', installCallback);
    };
  }, []);

  useEffect(() => {
    const appInstalledCb = () => {};
    window.addEventListener('appinstalled', appInstalledCb);
    return () => {
      window.removeEventListener('appinstalled', appInstalledCb);
    };
  }, []);
  return (
    <React.StrictMode>
      <LoadingBlock>
        <Router>
          <AppStateProvider>
            <WorkerSetup loadWebworker={moduleSupport} />
            <UIManager>
              <SWReloadPrompt />
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
                        <AppContainer />
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
