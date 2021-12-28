import React, { useEffect } from 'react';
import { Route, Switch, useLocation } from 'wouter';

import {
  getLastWorkspaceUsed,
  goToWsName,
  pushWsPath,
  useWorkspaceContext,
} from '@bangle.io/workspace-context';
import {
  HELP_FS_INDEX_WS_PATH,
  HELP_FS_WORKSPACE_NAME,
} from '@bangle.io/workspaces';
import { wsNameToPathname } from '@bangle.io/ws-path';

import { WorkspaceInvalidPath } from './pages/WorkspaceInvalidPath';
import { WorkspaceNativefsAuthBlockade } from './pages/WorkspaceNeedsAuth';
import { WorkspaceNotFound } from './pages/WorkspaceNotFound';
import { WsNamePage } from './pages/WsNamePage';

export function Routes() {
  const [location] = useLocation();
  const { bangleStore } = useWorkspaceContext();
  useEffect(() => {
    if (location === '/') {
      const lastWsName = getLastWorkspaceUsed();
      goToWsName(lastWsName || HELP_FS_WORKSPACE_NAME, { replace: true })(
        bangleStore.state,
      );
    }

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
      <Route path="/ws-nativefs-auth/:wsName">
        {(params) => <WorkspaceNativefsAuthBlockade wsName={params.wsName} />}
      </Route>
      <Route path="/ws-not-found/:wsName">
        <WorkspaceNotFound />
      </Route>
      <Route path="/ws-invalid-path/:wsName">
        <WorkspaceInvalidPath />
      </Route>
    </Switch>
  );
}
