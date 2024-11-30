import React from 'react';

import { ROUTES } from '@bangle.io/constants';
import { Redirect, Route, Switch } from 'wouter';
import { PageEditor } from './pages/page-editor';
import { PageFatalError } from './pages/page-fatal-error';
import { PageNativeFsAuthFailed } from './pages/page-native-fs-auth-failed';
import { PageNativeFsAuthReq } from './pages/page-native-fs-auth-req';
import { PageNotFound } from './pages/page-not-found';
import { PageWelcome } from './pages/page-welcome';
import { PageWorkspaceNotFound } from './pages/page-workspace-not-found';
import { PageWsHome } from './pages/page-ws-home';
import { PageWsPathNotFound } from './pages/page-ws-path-not-found';

export function AppRoutes() {
  return (
    <Switch>
      <Route path={ROUTES.pageEditor}>
        <PageEditor />
      </Route>
      <Route path={ROUTES.pageWsHome}>
        <PageWsHome />
      </Route>

      <Route path={ROUTES.pageNativeFsAuthReq}>
        <PageNativeFsAuthReq />
      </Route>
      <Route path={ROUTES.pageNativeFsAuthFailed}>
        <PageNativeFsAuthFailed />
      </Route>

      <Route path={ROUTES.pageWorkspaceNotFound}>
        <PageWorkspaceNotFound />
      </Route>

      <Route path={ROUTES.pageWsPathNotFound}>
        <PageWsPathNotFound />
      </Route>

      <Route path={ROUTES.pageNotFound}>
        <PageNotFound />
      </Route>

      <Route path={ROUTES.pageFatalError}>
        <PageFatalError />
      </Route>

      <Redirect to={ROUTES.pageNotFound} />

      <Route path={ROUTES.pageWelcome}>
        <PageWelcome />
      </Route>
    </Switch>
  );
}
