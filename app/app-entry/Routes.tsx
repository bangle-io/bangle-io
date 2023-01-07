import React, { useEffect } from 'react';
import { Redirect, Route, Switch, useLocation } from 'wouter';

import { lastWorkspaceUsed } from '@bangle.io/bangle-store';
import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import {
  BANGLE_HOME_PATH,
  HELP_FS_INDEX_WS_PATH,
  HELP_FS_WORKSPACE_NAME,
} from '@bangle.io/constants';
import { wsNameToPathname } from '@bangle.io/slice-page';
import { pushWsPath } from '@bangle.io/slice-workspace';
import { assertNotUndefined } from '@bangle.io/utils';

import { LandingPage } from './pages/LandingPage';
import { WorkspaceInvalidPath } from './pages/WorkspaceInvalidPath';
import { WorkspaceNativefsAuthBlockade } from './pages/WorkspaceNeedsAuth';
import { WorkspaceNotFound } from './pages/WorkspaceNotFound';
import { WorkspacePage } from './pages/WorkspacePage';

export function Routes() {
  const [location] = useLocation();
  const bangleStore = useBangleStoreContext();

  useEffect(() => {
    if (location === wsNameToPathname(HELP_FS_WORKSPACE_NAME)) {
      pushWsPath(HELP_FS_INDEX_WS_PATH)(
        bangleStore.state,
        bangleStore.dispatch,
      );
    }
  }, [location, bangleStore]);

  return (
    <Switch>
      <Route path="/ws/:wsName">
        <WorkspacePage />
      </Route>
      <Route path="/ws-auth/:wsName">
        {(params) => {
          assertNotUndefined(params.wsName, 'wsName cannot be undefined');

          return <WorkspaceNativefsAuthBlockade wsName={params.wsName} />;
        }}
      </Route>
      <Route path="/ws-not-found/:wsName">
        {(params) => <WorkspaceNotFound wsName={params.wsName} />}
      </Route>
      <Route path="/ws-invalid-path/:wsName">
        <WorkspaceInvalidPath />
      </Route>

      <Route path="/landing">
        <LandingPage />
      </Route>
      <Route path="/">
        {() => {
          const lastWsName = lastWorkspaceUsed.get();

          if (!lastWsName) {
            return <Redirect to={BANGLE_HOME_PATH} />;
          }

          return <Redirect to={'/landing'} />;
        }}
      </Route>
    </Switch>
  );
}
