import React, { useState, useEffect, useCallback } from 'react';
import { Route, useHistory, Redirect } from 'react-router-dom';
import { Workspace } from './pages/Workspace';
import { useWorkspaceContext } from 'workspace-context';
import { resolvePath } from 'ws-path';

import { HELP_FS_WORKSPACE_NAME, getWorkspaceInfo } from 'workspaces/index';
export function Routes({}) {
  return (
    <>
      <Route
        exact
        path="/"
        render={() => (
          <Redirect
            to={{
              pathname: '/ws/' + HELP_FS_WORKSPACE_NAME,
            }}
          />
        )}
      />
      <Route path="/ws/:wsName">
        <WorkspaceBlockade />
      </Route>
      <Route path="//ws-nativefs-auth//:wsName">
        <WorkspaceNativefsAuthBlockade />
      </Route>
    </>
  );
}
const NEEDS_PERMISSION = 'NEEDS_PERMISSION';
const PERMISSION_DENIED = 'PERMISSION_DENIED';
const READY = 'READY';
const UNKNOWN = 'UNKNOWN';
const permissionStatuses = [NEEDS_PERMISSION, PERMISSION_DENIED];
const WORKSPACE_NOT_FOUND = 'WORKSPACE_NOT_FOUND';
const LOG = true;
let log = LOG ? console.log.bind(console, 'Routes') : () => {};

function WorkspaceBlockade() {
  const { wsName, primaryWsPath } = useWorkspaceContext();
  const [workspaceStatus, updateWorkspaceStatus] = useState(UNKNOWN);
  const [workspaceInfo, updateWorkspaceInfo] = useState();
  const history = useHistory();

  // reset status when wsName changes
  useEffect(() => {
    updateWorkspaceStatus(READY);
  }, [wsName]);

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

  switch (workspaceStatus) {
    case UNKNOWN: {
      return null;
    }
    case READY: {
      return 'ready ' + wsName;
    }
    case NEEDS_PERMISSION: {
      if (workspaceInfo.type === 'nativefs') {
        return (
          <Redirect
            to={{
              pathname: '/ws-nativefs-auth/' + wsName,
            }}
          />
        );
      } else {
        throw new Error(
          `Routes permission unknown workspace type ${workspaceInfo?.type} `,
        );
      }
    }
    default: {
      return null;
    }
  }
}

function WorkspaceNativefsAuthBlockade() {}

function replaceHistoryState(history, newState) {
  return history.replace({
    ...history.location,
    state: {
      ...history.location?.state,
      ...newState,
    },
  });
}
