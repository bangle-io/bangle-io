import './style';

import { OverlayProvider } from '@react-aria/overlays';
import React, { useEffect, useRef } from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import type { BaseLocationHook } from 'wouter';
import { Router } from 'wouter';

import { _SerialOperationContextProvider } from '@bangle.io/api';
import { historySlice } from '@bangle.io/bangle-store';
import {
  NsmStoreContext,
  useNsmSliceState,
} from '@bangle.io/bangle-store-context';
import type { BaseHistory } from '@bangle.io/history';
import { createTo } from '@bangle.io/history';
import type { NsmStore } from '@bangle.io/shared-types';
import { nsmPageSlice, pathMatcher } from '@bangle.io/slice-page';

import { AppContainer } from './AppContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useUsageAnalytics } from './hooks/use-usage-analytics';
import { SWReloadPrompt } from './service-worker/SWReloadPrompt';
import { WatchUI } from './watchers/WatchUI';
import { WatchWorkspace } from './watchers/WatchWorkspace';

const useRouterHook: BaseLocationHook = () => {
  const { location } = useNsmSliceState(nsmPageSlice);
  const { history } = useNsmSliceState(historySlice);

  const to = history ? createTo(location, history) || '' : '';
  const pendingCalls = useRef<Array<Parameters<BaseHistory['navigate']>>>([]);

  const navigate = history
    ? history.navigate.bind(history)
    : (...args: Parameters<BaseHistory['navigate']>) => {
        pendingCalls.current.push(args);
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

export function Entry({ nsmStore }: { nsmStore: NsmStore }) {
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
      <ReactErrorBoundary FallbackComponent={ErrorBoundary}>
        <Router hook={useRouterHook} matcher={pathMatcher as any}>
          {/* Used by OverlayContainer -- any modal or popover */}
          <OverlayProvider>
            <NsmStoreContext.Provider value={nsmStore}>
              <SWReloadPrompt />
              <WatchWorkspace />
              <WatchUI />
              <_SerialOperationContextProvider>
                <AppContainer />
              </_SerialOperationContextProvider>
            </NsmStoreContext.Provider>
          </OverlayProvider>
        </Router>
      </ReactErrorBoundary>
    </React.StrictMode>
  );
}
