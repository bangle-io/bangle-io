import React from 'react';

import { useCoreServices } from '@bangle.io/context';
import { useAtomValue } from 'jotai';
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

export function AppRoutes() {
  const coreServices = useCoreServices();

  const route = useAtomValue(coreServices.navigation.$routeInfo).route;

  console.log('route', route);
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
      const _route: never = route;

      throw new Error(`Unknown route: ${_route}`);
    }
  }
}
