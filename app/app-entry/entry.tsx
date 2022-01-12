import './style';

import { OverlayProvider } from '@react-aria/overlays';
import React, { useEffect, useRef, useState } from 'react';
import { BaseLocationHook, Router } from 'wouter';

import { initializeBangleStore } from '@bangle.io/bangle-store';
import { EditorManager } from '@bangle.io/slice-editor-manager';
import {
  ExtensionRegistryContextProvider,
  ExtensionStateContextProvider,
} from '@bangle.io/extension-registry';
import {
  BaseHistory,
  getLocationTo,
  usePageContext,
} from '@bangle.io/page-context';
import { SerialOperationContextProvider } from '@bangle.io/serial-operation-context';
import { polyfills } from '@bangle.io/shared';
import { WorkspaceContextProvider } from '@bangle.io/slice-workspace';
import { UIManager } from '@bangle.io/slice-ui';
import { pathMatcher } from '@bangle.io/ws-path';

import { AppContainer } from './AppContainer';
import { AppStateProvider } from './AppStateProvider';
import { useUsageAnalytics } from './hooks/use-usage-analytics';
import { SWReloadPrompt } from './service-worker/SWReloadPrompt';
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

let mountCount = 0;

const useRouterHook: BaseLocationHook = () => {
  const { pageState, store } = usePageContext();
  const to = getLocationTo()(store.state) || '';
  const pendingCalls = useRef<Parameters<BaseHistory['navigate']>[]>([]);

  const navigate = pageState?.history
    ? pageState.history.navigate.bind(pageState.history)
    : (...args: Parameters<BaseHistory['navigate']>) => {
        pendingCalls.current?.push(args);
      };

  // apply any navigation calls that we might have missed during the
  // state loading
  if (pendingCalls.current.length > 0 && pageState?.history) {
    for (const call of pendingCalls.current) {
      navigate(...call);
    }
    pendingCalls.current = [];
  }

  return [to, navigate];
};

export function Entry() {
  const [bangleStoreChanged, _setBangleStoreCounter] = useState(0);
  const [bangleStore] = useState(() => {
    mountCount++;
    if (mountCount > 1) {
      console.warn('entry comp remounted');
    }
    // TODO the store is not ready for destroying and recreation yet.
    return initializeBangleStore({
      onUpdate: () => _setBangleStoreCounter((c) => c + 1),
    });
  });
  useEffect(() => {
    return () => {
      bangleStore.destroy();
    };
  }, [bangleStore]);

  useEffect(() => {
    const installCallback = (event: BeforeInstallPromptEvent) => {
      console.debug('before install prompt');
      // not show infobar on mobile
      event.preventDefault();
    };
    window.addEventListener('beforeinstallprompt', installCallback);
    return () => {
      window.removeEventListener('beforeinstallprompt', installCallback);
    };
  }, []);

  useEffect(() => {
    const appInstalledCb = () => {
      console.debug('appinstalled ');
    };
    window.addEventListener('appinstalled', appInstalledCb);
    return () => {
      window.removeEventListener('appinstalled', appInstalledCb);
    };
  }, []);

  useUsageAnalytics();

  return (
    <React.StrictMode>
      <LoadingBlock>
        <OverlayProvider className="w-full h-full">
          <Router hook={useRouterHook} matcher={pathMatcher}>
            <AppStateProvider
              bangleStore={bangleStore}
              bangleStoreChanged={bangleStoreChanged}
            >
              <UIManager>
                <ExtensionRegistryContextProvider>
                  <ExtensionStateContextProvider>
                    <WorkspaceContextProvider>
                      <SWReloadPrompt />
                      <WatchWorkspace />
                      <WatchUI />
                      <EditorManager>
                        <SerialOperationContextProvider>
                          <AppContainer />
                        </SerialOperationContextProvider>
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
