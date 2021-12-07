import './style';

import { OverlayProvider } from '@react-aria/overlays';
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
import { useLocalStorage } from '@bangle.io/utils';
import { WorkerSetup } from '@bangle.io/worker-setup';
import { WorkspaceContextProvider } from '@bangle.io/workspace-context';

import {
  AppContainer,
  handleNativefsAuthError,
  handleOnInvalidPath,
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

  const [lastOpened, updateLastOpened] = useLocalStorage<number | undefined>(
    'entry-lao-2',
    undefined,
  );

  const [dauCount, updateDauCount] = useLocalStorage<number | undefined>(
    'entry-dau-2',
    0,
  );

  useEffect(() => {
    if (dauCount === 3) {
      (window as any).fathom?.trackGoal('9MRJUARY', 1);
    }
    if (dauCount === 5) {
      (window as any).fathom?.trackGoal('EWFOWT8V', 1);
    }
  }, [dauCount, updateDauCount]);

  useEffect(() => {
    // use local storage bug where it doesnt save
    // info in storage initially
    if (lastOpened === undefined) {
      updateLastOpened(Date.now());
    }

    if (lastOpened && Date.now() - lastOpened > 60 * 60 * 24 * 1000) {
      updateLastOpened(Date.now());
      updateDauCount((dauCount = 0) => dauCount + 1);

      (window as any).fathom?.trackGoal('EC54OGMM', 1);
    }
  }, [lastOpened, updateDauCount, updateLastOpened]);

  return (
    <React.StrictMode>
      <LoadingBlock>
        <OverlayProvider className="w-full h-full">
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
                      onInvalidPath={handleOnInvalidPath}
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
        </OverlayProvider>
      </LoadingBlock>
    </React.StrictMode>
  );
}
