import React from 'react';

import { ROUTES } from '@bangle.io/constants';
import { Redirect, Route, Switch } from 'wouter';
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
      <Route path={ROUTES.pageWelcome}>
        <PageWelcome />
      </Route>
      <Redirect to={ROUTES.pageNotFound} />
    </Switch>
  );
}
