import { requestNativeBrowserFSPermission } from 'baby-fs';
import React, { useEffect, useState } from 'react';
import { Redirect, useHistory, useParams } from 'react-router-dom';
import { useUIManagerContext } from 'ui-context';
import { keybindingsHelper } from 'utils';
import {
  getWorkspaceInfo,
  WORKSPACE_NOT_FOUND_ERROR,
  WorkspaceError,
} from 'workspaces';

import { EditorWrapperUI } from '../components/EditorWrapperUI';

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
    <EditorWrapperUI>
      <div className="flex flex-grow justify-center flex-col cursor-pointer">
        <h3 className="text-xl sm:text-3xl lg:text-3xl leading-none font-bold  mb-8">
          👩‍💻 Bangle.io needs your permission to read "{wsName}"
        </h3>
        <span className="flex-shrink text-lg sm:leading-10 font-semibold mb-10 sm:mb-1">
          {permissionDenied &&
            'You have denied bangle.io permission to access your workspace.'}
        </span>
        <button
          onClick={() => {
            requestFSPermission();
          }}
          className="w-full mt-6 sm:w-auto flex-none bg-gray-800 hover:bg-purple-600 text-white text-lg leading-6 font-semibold py-3 px-6 border border-transparent rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-900 focus:outline-none transition-colors duration-200"
        >
          Press <kbd>Enter</kbd> or 👆click this grant permission.
        </button>
      </div>
    </EditorWrapperUI>
  );
}
