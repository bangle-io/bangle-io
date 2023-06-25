import React from 'react';
import { Redirect, Route, Switch } from 'wouter';

import { lastWorkspaceUsed } from '@bangle.io/bangle-store';
import { BANGLE_HOME_PATH } from '@bangle.io/constants';
import { assertNotUndefined } from '@bangle.io/utils';

import { LandingPage } from './pages/LandingPage';
import { WorkspaceInvalidPath } from './pages/WorkspaceInvalidPath';
import { WorkspaceNativefsAuthBlockade } from './pages/WorkspaceNeedsAuth';
import { WorkspaceNotFound } from './pages/WorkspaceNotFound';
import { WorkspacePage } from './pages/WorkspacePage';

export function Routes() {
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
