import { APP_ENV, IS_PRODUCTION_APP_ENV } from 'config';
import React, { useEffect, useState } from 'react';
import { Redirect, Route, useHistory } from 'react-router-dom';
import { useWorkspaceContext } from 'workspace-context';
import { getWorkspaceInfo, HELP_FS_WORKSPACE_NAME } from 'workspaces';
import { resolvePath } from 'ws-path';

import {
  getLastWorkspaceUsed,
  saveLastWorkspaceUsed,
} from './misc/last-workspace-used';
import { WorkspacePage } from './pages/Workspace';
import { WorkspaceNativefsAuthBlockade } from './pages/WorkspaceNeedsAuth';
import { WorkspaceNotFound } from './pages/WorkspaceNotFound';

export function Routes() {
  return (
    <>
      <Route
        exact
        path="/"
        render={() => {
          const lastWsName = getLastWorkspaceUsed();
          if (lastWsName) {
            return (
              <Redirect
                to={{
                  pathname: '/ws/' + lastWsName,
                }}
              />
            );
          }
          return (
            <Redirect
              to={{
                pathname: '/ws/' + HELP_FS_WORKSPACE_NAME,
              }}
            />
          );
        }}
      />
      <Route path="/ws/:wsName">
        <WorkspaceBlockade>
          <WorkspacePage />
        </WorkspaceBlockade>
      </Route>
      <Route path="/ws-nativefs-auth/:wsName">
        <WorkspaceNativefsAuthBlockade
          onWorkspaceNotFound={handleWorkspaceNotFound}
        />
      </Route>
      <Route path="/ws-not-found/:wsName">
        <WorkspaceNotFound />
      </Route>
    </>
  );
}

const LOG = true;
let log = LOG ? console.log.bind(console, 'Routes') : () => {};
type UnPromisify<T> = T extends Promise<infer U> ? U : T;

function WorkspaceBlockade({ children }) {
  const { wsName, primaryWsPath } = useWorkspaceContext();
  const [workspaceInfo, updateWorkspaceInfo] = useState<
    UnPromisify<ReturnType<typeof getWorkspaceInfo>> | undefined
  >();
  const history = useHistory();

  // Persist workspaceInfo in the history to
  // prevent release of the native browser FS permission
  useEffect(() => {
    if (workspaceInfo?.type === 'nativefs') {
      log('replace history state');
      replaceHistoryState(history, {
        workspaceInfo: workspaceInfo,
      });
    }
  }, [workspaceInfo, history]);

  useEffect(() => {
    if (wsName) {
      document.title = primaryWsPath
        ? `${resolvePath(primaryWsPath).fileName} - bangle.io`
        : `${wsName} - bangle.io`;
    } else {
      document.title = 'bangle.io';
    }

    if (!IS_PRODUCTION_APP_ENV) {
      document.title = APP_ENV + ':' + document.title;
    }
  }, [primaryWsPath, wsName]);

  useEffect(() => {
    let destroyed = false;
    if (wsName) {
      getWorkspaceInfo(wsName).then((_workspaceInfo) => {
        if (!destroyed) {
          updateWorkspaceInfo(_workspaceInfo);
        }
      });
    }
    return () => {
      destroyed = true;
    };
  }, [wsName]);

  useEffect(() => {
    if (wsName && workspaceInfo) {
      saveLastWorkspaceUsed(wsName);
    }
  }, [wsName, workspaceInfo]);

  return children;
}

export function handleNativefsAuthError(wsName, history) {
  if (history.location?.pathname?.startsWith('/ws-nativefs-auth/' + wsName)) {
    return;
  }
  history.replace({
    pathname: '/ws-nativefs-auth/' + wsName,
    state: {
      previousLocation: history.location,
    },
  });
}

export function handleWorkspaceNotFound(wsName, history) {
  if (history.location?.pathname?.startsWith('/ws-not-found/' + wsName)) {
    return;
  }
  history.replace({
    pathname: '/ws-not-found/' + wsName,
    state: {},
  });
}

function replaceHistoryState(history, newState) {
  return history.replace({
    ...history.location,
    state: {
      ...history.location?.state,
      ...newState,
    },
  });
}
