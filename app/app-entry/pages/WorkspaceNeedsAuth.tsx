import React, { useEffect, useState } from 'react';
import { Redirect, useHistory, useParams } from 'react-router-dom';

import { requestNativeBrowserFSPermission } from '@bangle.io/baby-fs';
import { Page } from '@bangle.io/ui-components';
import { useUIManagerContext } from '@bangle.io/ui-context';
import { keybindingsHelper } from '@bangle.io/utils';
import {
  getWorkspaceInfo,
  WORKSPACE_NOT_FOUND_ERROR,
  WorkspaceError,
} from '@bangle.io/workspaces';

export function WorkspaceNativefsAuthBlockade({ onWorkspaceNotFound }) {
  const [permissionDenied, updatePermissionDenied] = useState(false);
  const history = useHistory();
  const { wsName } = useParams();

  const onGranted = () => {
    const previousLocation = history.location?.state?.previousLocation;
    if (previousLocation) {
      history.replace(previousLocation);
    } else {
      history.replace({
        pathname: '/ws/' + wsName,
      });
    }
  };
  const requestFSPermission = async () => {
    let workspace;
    try {
      workspace = await getWorkspaceInfo(wsName);
    } catch (error) {
      if (
        error instanceof WorkspaceError &&
        error.code === WORKSPACE_NOT_FOUND_ERROR
      ) {
        onWorkspaceNotFound(wsName, history);
      }
      throw error;
    }
    if (!workspace) {
      throw new Error('workspace not found');
    }
    if (workspace.type !== 'nativefs') {
      onGranted();
      return true;
    }
    const result = await requestNativeBrowserFSPermission(
      workspace.metadata.rootDirHandle,
    );
    if (result) {
      onGranted();
      return true;
    } else {
      updatePermissionDenied(true);
      return false;
    }
  };

  if (!wsName) {
    return (
      <Redirect
        to={{
          pathname: '/',
        }}
      />
    );
  }

  return (
    <PermissionModal
      permissionDenied={permissionDenied}
      requestFSPermission={requestFSPermission}
      wsName={wsName}
    />
  );
}

function PermissionModal({ permissionDenied, requestFSPermission, wsName }) {
  const { paletteType } = useUIManagerContext();
  const isPaletteActive = Boolean(paletteType);
  useEffect(() => {
    let callback = keybindingsHelper({
      Enter: () => {
        if (isPaletteActive) {
          return false;
        }
        requestFSPermission();
        return true;
      },
    });
    document.addEventListener('keydown', callback);
    return () => {
      document.removeEventListener('keydown', callback);
    };
  }, [requestFSPermission, isPaletteActive]);

  return (
    <Page verticallyCenter={true} showBoxAround={true}>
      <h3 className="sm:text-3xl lg:text-3xl mb-8 text-xl font-bold leading-none">
        👩‍💻 Bangle.io needs your permission to read "{wsName}"
      </h3>
      <span className="sm:leading-10 sm:mb-1 flex-shrink mb-10 text-lg font-semibold">
        {permissionDenied &&
          'You have denied bangle.io permission to access your workspace.'}
      </span>
      <button
        onClick={() => {
          requestFSPermission();
        }}
        className="sm:w-auto hover:bg-purple-600 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-900 focus:outline-none flex-none w-full px-6 py-3 mt-6 text-lg font-semibold leading-6 text-white transition-colors duration-200 bg-gray-800 border border-transparent"
      >
        Press <kbd>Enter</kbd> or 👆click this grant permission.
      </button>
    </Page>
  );
}
