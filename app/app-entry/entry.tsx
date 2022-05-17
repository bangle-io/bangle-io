import './style';

import { OverlayProvider } from '@react-aria/overlays';
import React, { useEffect, useRef, useState } from 'react';
import { BaseLocationHook, Router } from 'wouter';

import { SerialOperationContextProvider } from '@bangle.io/api/internal';
import {
  historySliceKey,
  initializeBangleStore,
} from '@bangle.io/bangle-store';
import { useSliceState } from '@bangle.io/bangle-store-context';
import { ApplicationStore, AppState } from '@bangle.io/create-store';
import {
  ExtensionRegistryContextProvider,
  ExtensionStateContextProvider,
} from '@bangle.io/extension-registry';
import { BaseHistory, createTo } from '@bangle.io/history';
import { EditorManager } from '@bangle.io/slice-editor-manager';
import { pathMatcher, usePageContext } from '@bangle.io/slice-page';
import { UIManager } from '@bangle.io/slice-ui';
import { WorkspaceContextProvider } from '@bangle.io/slice-workspace';

import { AppContainer } from './AppContainer';
import { AppStateProvider } from './AppStateProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useUsageAnalytics } from './hooks/use-usage-analytics';
import { SWReloadPrompt } from './service-worker/SWReloadPrompt';
import { WatchUI } from './watchers/WatchUI';
import { WatchWorkspace } from './watchers/WatchWorkspace';

const useRouterHook: BaseLocationHook = () => {
  const { pageState } = usePageContext();

  const { sliceState } = useSliceState(historySliceKey);
  const history = sliceState?.history;

  const to =
    history && pageState ? createTo(pageState.location, history) || '' : '';
  const pendingCalls = useRef<Array<Parameters<BaseHistory['navigate']>>>([]);

  const navigate = history
    ? history.navigate.bind(history)
    : (...args: Parameters<BaseHistory['navigate']>) => {
        pendingCalls.current?.push(args);
      };

  // apply any navigation calls that we might have missed during the
  // state loading
  if (pendingCalls.current.length > 0 && history) {
    for (const call of pendingCalls.current) {
      navigate(...call);
    }
    pendingCalls.current = [];
  }

  return [to, navigate];
};

let storeInitialized = false;
export function Entry() {
  const [bangleStoreChanged, _setBangleStoreCounter] = useState(0);
  const [bangleStore] = useState(() => {
    // there are cases when React will remount components
    // and we want to avoid reinstantiating our store.
    if (storeInitialized) {
      // If we reach here it is definitely a broader error
      // and we donot want to load the application.
      // Surprisingly throwing an error here prevents any other errors
      // so we just create a dummy store.
      return ApplicationStore.create({
        storeName: 'bangle-store',
        state: AppState.create({
          slices: [],
          opts: {},
        }) as any,
      });
    }

    storeInitialized = true;

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
      <ErrorBoundary store={bangleStore}>
        <Router hook={useRouterHook} matcher={pathMatcher as any}>
          {/* Used by OverlayContainer -- any modal or popover */}
          <OverlayProvider>
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
          </OverlayProvider>
        </Router>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
