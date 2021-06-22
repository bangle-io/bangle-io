import React, { useContext, useState, useEffect, useCallback } from 'react';
import {
  useParams,
  useLocation,
  Route,
  useHistory,
  Redirect,
} from 'react-router-dom';
import { WorkspacePage } from './pages/Workspace';
import { useWorkspaceContext } from 'workspace-context';
import { resolvePath } from 'ws-path';
import { requestNativeBrowserFSPermission } from 'baby-fs/index';
import { HELP_FS_WORKSPACE_NAME, getWorkspaceInfo } from 'workspaces/index';
import { EditorWrapperUI } from './components/EditorWrapperUI';
import { keybindingsHelper } from 'utils';
import { UIManagerContext } from 'ui-context';

export function Routes() {
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
        <WorkspaceBlockade>
          <WorkspacePage />
        </WorkspaceBlockade>
      </Route>
      <Route path="/ws-nativefs-auth/:wsName">
        <WorkspaceNativefsAuthBlockade />
      </Route>
    </>
  );
}

const LOG = true;
let log = LOG ? console.log.bind(console, 'Routes') : () => {};

function WorkspaceBlockade({ children }) {
  const { wsName, primaryWsPath } = useWorkspaceContext();
  const [workspaceInfo, updateWorkspaceInfo] = useState();
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

function WorkspaceNativefsAuthBlockade() {
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
    const workspace = await getWorkspaceInfo(wsName);
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
  const { paletteType } = useContext(UIManagerContext);
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

function replaceHistoryState(history, newState) {
  return history.replace({
    ...history.location,
    state: {
      ...history.location?.state,
      ...newState,
    },
  });
}
