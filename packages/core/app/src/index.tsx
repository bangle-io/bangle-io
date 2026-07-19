import {
  CoreServiceProvider,
  LoggerProvider,
  type Services,
  useCoreServices,
} from '@bangle.io/context';
import type { Logger } from '@bangle.io/logger';
import { OmniSearch } from '@bangle.io/omni-search';
import type { AppRouteInfo, RootEmitter, Store } from '@bangle.io/types';
import { Toaster } from '@bangle.io/ui-components';
import { Provider, useAtomValue } from 'jotai/react';
import React from 'react';
import { AppErrorHandler } from './app-error-handler';
import {
  initializePwaInstallPromptTracking,
  syncAppDocumentTitle,
  syncWindowControlsOverlayState,
} from './common/pwa-install';
import { PwaLaunchActions } from './common/pwa-launch-actions';
import { ErrorBoundary } from './components/feedback/error-boundary';
import { AppDialogs } from './dialogs/app-dialogs';
import { PwaOpenInAppPrompt } from './dialogs/pwa-open-in-app-prompt';
import { AppSidebar } from './layout/app-sidebar';
import {
  PageAsset,
  PageEditor,
  PageNativeFsRecovery,
  PageNotFound,
  PageSettings,
  PageWelcome,
  PageWsHome,
} from './pages';
import { SaveProtection } from './save-protection';

// Re-exported for the bootstrap entry: launch params must be consumed
// before the router captures `window.location.search`, or every later
// navigation re-emits (and a reload replays) the consumed shortcut or
// deep link.
export { consumePwaLaunchParams } from './common/pwa-install';

export function App({
  logger,
  store,
  rootEmitter,
  services,
}: {
  logger: Logger;
  store: Store;
  rootEmitter: RootEmitter;
  services: Services;
}) {
  return (
    <LoggerProvider logger={logger}>
      <Provider store={store}>
        <CoreServiceProvider services={services.core}>
          <ErrorBoundary>
            <BrowserAppDocumentSetup />
            <AppDialogs />
            <PwaOpenInAppPrompt />
            <PwaLaunchActions />
            <OmniSearch />
            <Toaster position="top-right" />
            <AppErrorHandler rootEmitter={rootEmitter} />
            <SaveProtection />
            <AppSidebar>
              <AppRoutes />
            </AppSidebar>
          </ErrorBoundary>
        </CoreServiceProvider>
      </Provider>
    </LoggerProvider>
  );
}

function BrowserAppDocumentSetup() {
  React.useEffect(() => {
    const abortController = new AbortController();

    syncAppDocumentTitle(document);
    initializePwaInstallPromptTracking(window);
    syncWindowControlsOverlayState({
      documentRef: document,
      navigatorRef: navigator,
      signal: abortController.signal,
    });

    return () => {
      abortController.abort();
    };
  }, []);

  return null;
}

function routeUsesWorkspaceFileTree(route: AppRouteInfo['route']): boolean {
  switch (route) {
    case 'editor':
    case 'asset':
    case 'ws-home':
      return true;
    case 'welcome':
    case 'not-found':
    case 'settings-general':
    case 'settings-workspaces':
      return false;
    default: {
      const _exhaustiveCheck: never = route;
      throw new Error(`Unknown route: ${_exhaustiveCheck}`);
    }
  }
}

function AppRoutes() {
  const coreServices = useCoreServices();
  const { route } = useAtomValue(coreServices.navigation.$routeInfo);
  const fileTreeListState = useAtomValue(
    coreServices.workspaceState.$fileTreeListState,
  );

  if (
    fileTreeListState.status === 'native-fs-directory-not-found' &&
    routeUsesWorkspaceFileTree(route)
  ) {
    return <PageNativeFsRecovery wsName={fileTreeListState.wsName} />;
  }

  switch (route) {
    case 'editor':
      return <PageEditor />;
    case 'asset':
      return <PageAsset />;
    case 'ws-home':
      return <PageWsHome />;
    case 'welcome':
      return <PageWelcome />;
    case 'not-found':
      return <PageNotFound />;
    case 'settings-general':
    case 'settings-workspaces':
      return <PageSettings />;

    default: {
      // Use assertion for exhaustiveness check
      const _exhaustiveCheck: never = route;
      throw new Error(`Unknown route: ${_exhaustiveCheck}`);
    }
  }
}
