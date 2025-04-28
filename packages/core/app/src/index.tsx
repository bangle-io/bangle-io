import {
  CoreServiceProvider,
  LoggerProvider,
  PlatformServiceProvider,
  useCoreServices,
} from '@bangle.io/context';
import type { Logger } from '@bangle.io/logger';
import { OmniSearch } from '@bangle.io/omni-search';
import type { RootEmitter, Services, Store } from '@bangle.io/types';
import { Toaster } from '@bangle.io/ui-components';
import { Provider, useAtomValue } from 'jotai/react';
import React from 'react';
import { AppErrorHandler } from './app-error-handler';
import { ErrorBoundary } from './components/feedback/error-boundary';
import { AppDialogs } from './dialogs/app-dialogs';
import { AppSidebar } from './layout/app-sidebar';
import {
  PageEditor,
  PageFatalError,
  PageNativeFsAuthFailed,
  PageNativeFsAuthReq,
  PageNotFound,
  PageWelcome,
  PageWorkspaceNotFound,
  PageWsHome,
  PageWsPathNotFound,
} from './pages';

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
        <PlatformServiceProvider services={services.platform}>
          <CoreServiceProvider services={services.core}>
            <ErrorBoundary>
              <AppDialogs />
              <OmniSearch />
              <Toaster position="top-center" />
              <AppErrorHandler rootEmitter={rootEmitter} />
              <AppSidebar>
                <AppRoutes />
              </AppSidebar>
            </ErrorBoundary>
          </CoreServiceProvider>
        </PlatformServiceProvider>
      </Provider>
    </LoggerProvider>
  );
}

function AppRoutes() {
  const coreServices = useCoreServices();
  const { route } = useAtomValue(coreServices.navigation.$routeInfo);

  switch (route) {
    case 'editor':
      return <PageEditor />;
    case 'ws-home':
      return <PageWsHome />;
    case 'welcome':
      return <PageWelcome />;
    case 'native-fs-auth-req':
      return <PageNativeFsAuthReq />;
    case 'native-fs-auth-failed':
      return <PageNativeFsAuthFailed />;
    case 'workspace-not-found':
      return <PageWorkspaceNotFound />;
    case 'ws-path-not-found':
      return <PageWsPathNotFound />;
    case 'fatal-error':
      return <PageFatalError />;
    case 'not-found':
      return <PageNotFound />;

    default: {
      // Use assertion for exhaustiveness check
      const _exhaustiveCheck: never = route;
      throw new Error(`Unknown route: ${_exhaustiveCheck}`);
    }
  }
}
