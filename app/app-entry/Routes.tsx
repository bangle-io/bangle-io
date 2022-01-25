import React, { useEffect } from 'react';
import { Redirect, Route, Switch, useLocation } from 'wouter';

import { lastWorkspaceUsed } from '@bangle.io/bangle-store';
import {
  HELP_FS_INDEX_WS_PATH,
  HELP_FS_WORKSPACE_NAME,
} from '@bangle.io/constants';
import { pushWsPath, useWorkspaceContext } from '@bangle.io/slice-workspace';
import { wsNameToPathname } from '@bangle.io/ws-path';

import { WorkspaceInvalidPath } from './pages/WorkspaceInvalidPath';
import { WorkspaceNativefsAuthBlockade } from './pages/WorkspaceNeedsAuth';
import { WorkspaceNotFound } from './pages/WorkspaceNotFound';
import { WsNamePage } from './pages/WsNamePage';

export function Routes() {
  const [location] = useLocation();
  const { bangleStore, workspacesInfo } = useWorkspaceContext();
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
        <WsNamePage />
      </Route>
      <Route path="/ws-auth/:wsName">
        {(params) => <WorkspaceNativefsAuthBlockade wsName={params.wsName} />}
      </Route>
      <Route path="/ws-not-found/:wsName">
        {(params) => <WorkspaceNotFound wsName={params.wsName} />}
      </Route>
      <Route path="/ws-invalid-path/:wsName">
        <WorkspaceInvalidPath />
      </Route>
      <Route path="/">
        {() => {
          const lastWsName = lastWorkspaceUsed.get() || HELP_FS_WORKSPACE_NAME;

          if (lastWsName && workspacesInfo?.[lastWsName]?.deleted) {
            lastWorkspaceUsed.save(HELP_FS_WORKSPACE_NAME);

            return <Redirect to={'/ws/' + HELP_FS_WORKSPACE_NAME} />;
          }

          return <Redirect to={'/ws/' + lastWsName} />;
        }}
      </Route>
    </Switch>
  );
}
