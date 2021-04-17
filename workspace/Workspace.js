import {
  BaseFileSystemError,
  NATIVE_BROWSER_PERMISSION_ERROR,
  requestNativeBrowserFSPermission,
} from 'baby-fs';
import React, { useEffect, useState } from 'react';
import { useCatchRejection } from 'utils/index';
import { useHistory } from 'react-router-dom';
import { getWorkspaceInfo } from './workspace-helpers';
import { useWorkspacePath } from './workspace-hooks';
import { replaceHistoryState } from './history-utils';

const LOG = false;
let log = LOG ? console.log.bind(console, 'Workspace') : () => {};

export const NEEDS_PERMISSION = 'NEEDS_PERMISSION';
export const PERMISSION_DENIED = 'PERMISSION_DENIED';
export const READY = 'READY';
export const notAllowedStatuses = [NEEDS_PERMISSION, PERMISSION_DENIED];

/**
 *
 * renderPermissionModal - if workspace requires permission
 *    this render prop will rendered instead of the children
 */
export function Workspace({ children, renderPermissionModal }) {
  const { wsName } = useWorkspacePath();
  const history = useHistory();
  const [workspaceStatus, updateWorkspaceStatus] = useState(READY);
  const [workspaceInfo, updateWorkspaceInfo] = useState();

  log('history state', history.location.state);
  log('history location', history.location);

  // reset status when wsName changes
  useEffect(() => {
    updateWorkspaceStatus(READY);
  }, [wsName]);

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
    if (!workspaceInfo) {
      return;
    }
    const state = history.location.state;
    if (
      state?.workspaceInfo?.name === workspaceInfo?.name &&
      state?.workspaceStatus === workspaceStatus
    ) {
      log('history state synced');
      return;
    }

    // Persist workspaceInfo in the history to
    // prevent release of the native browser FS permission
    replaceHistoryState(history, {
      workspaceInfo,
      workspaceStatus: workspaceStatus,
    });
  }, [history, workspaceStatus, workspaceInfo]);

  useCatchRejection((e) => {
    const reason = e.reason;
    if (
      reason instanceof BaseFileSystemError &&
      reason.code === NATIVE_BROWSER_PERMISSION_ERROR
    ) {
      if (!notAllowedStatuses.includes(workspaceStatus)) {
        updateWorkspaceStatus(NEEDS_PERMISSION);
      }
      e.preventDefault();
    }
  });

  if (notAllowedStatuses.includes(workspaceStatus)) {
    return renderPermissionModal({
      wsName,
      // if the user denies explicitly in the prompt
      permissionDenied: workspaceStatus === PERMISSION_DENIED,
      requestFSPermission: async () => {
        const workspace = await getWorkspaceInfo(wsName);
        if (!workspace) {
          throw new Error('workspace not found');
        }
        if (workspace.type !== 'nativefs') {
          updateWorkspaceStatus(READY);
          return true;
        }
        const result = await requestNativeBrowserFSPermission(
          workspace.metadata.rootDirHandle,
        );
        if (result) {
          updateWorkspaceStatus(READY);
          return true;
        } else {
          updateWorkspaceStatus(PERMISSION_DENIED);
          return false;
        }
      },
    });
  }
  return children;
}
