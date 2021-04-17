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
  const [status, updateStatus] = useState(READY);

  // reset status when wsName changes
  useEffect(() => {
    updateStatus(READY);
  }, [wsName]);

  useCatchRejection((e) => {
    const reason = e.reason;
    if (
      reason instanceof BaseFileSystemError &&
      reason.code === NATIVE_BROWSER_PERMISSION_ERROR
    ) {
      if (!notAllowedStatuses.includes(status)) {
        updateStatus(NEEDS_PERMISSION);
      }
      e.preventDefault();
    }
  });

  // Persist workspaceInfo in the history to
  // prevent release of the native browser FS permission
  useEffect(() => {
    let destroyed = false;
    // update the history state only if it is different from the current
    // wsName
    if (history.location?.state?.workspaceInfo?.name !== wsName) {
      getWorkspaceInfo(wsName).then((workspaceInfo) => {
        if (destroyed) {
          return;
        }
        history.replace({
          ...history.location,
          state: { ...history.location.state, workspaceInfo },
        });
      });
    }

    return () => {
      destroyed = true;
    };
  }, [wsName, history]);

  if (notAllowedStatuses.includes(status)) {
    return renderPermissionModal({
      wsName,
      // if the user denies explicitly in the prompt
      permissionDenied: status === PERMISSION_DENIED,
      requestFSPermission: async () => {
        const workspace = await getWorkspaceInfo(wsName);
        if (!workspace) {
          throw new Error('workspace not found');
        }
        if (workspace.type !== 'nativefs') {
          updateStatus(READY);
          return true;
        }
        const result = await requestNativeBrowserFSPermission(
          workspace.metadata.rootDirHandle,
        );
        if (result) {
          updateStatus(READY);
          return true;
        } else {
          updateStatus(PERMISSION_DENIED);
          return false;
        }
      },
    });
  }
  return children;
}
