import {
  BaseFileSystemError,
  FILE_NOT_FOUND_ERROR,
  NATIVE_BROWSER_PERMISSION_ERROR,
  UPSTREAM_ERROR,
  hasPermission,
  requestPermission,
} from 'baby-fs';
import React, { useEffect, useCallback } from 'react';
import { keybindingsHelper, useCatchError } from 'utils/index';
import { WorkspaceError } from './errors';
import {
  getWorkspaceInfo,
  WORKSPACE_NOT_FOUND_ERROR,
} from './workspace-helpers';
import { useWorkspacePath } from './workspace-hooks';

const LOG = false;
let log = LOG ? console.log.bind(console, 'Workspace') : () => {};

/**
 *
 * @param {Object} param0
 */
export function Workspace({ children }) {
  const {
    wsName,
    wsPath,
    wsPermissionState,
    setWsPermissionState,
  } = useWorkspacePath();

  usePermissions();
  useEffect(() => {
    if (wsName) {
      document.title = wsPath
        ? `bangle.io - ${wsPath}`
        : `bangle.io - ${wsName}`;
    } else {
      document.title = 'bangle.io';
    }
  }, [wsPath, wsName]);

  useHandleErrors();
  log('wsName', wsName, 'wsPermissionState', wsPermissionState.type);
  if (wsName == null) {
    return null;
  }

  switch (wsPermissionState.type) {
    case undefined: {
      return <span></span>;
    }

    case 'loading': {
      return <span>loading...</span>;
    }

    case 'ready': {
      return children;
    }

    case 'permission': {
      return (
        <PermissionModal
          onPermissionGranted={(granted) => {
            if (granted) {
              setWsPermissionState({
                type: 'ready',
                workspace: wsPermissionState.workspace,
              });
            } else {
              setWsPermissionState({
                type: 'permission',
                workspace: wsPermissionState.workspace,
              });
            }
          }}
          workspace={wsPermissionState.workspace}
        />
      );
    }

    case 'error': {
      const { error } = wsPermissionState;
      return (
        <div>
          <span>Encountered an Error</span>
          <br />
          <span>
            {error.name}: {error.message}
          </span>
          <br />
          <span>
            Please try reloading the page or open a ticket if the issue persists
          </span>
        </div>
      );
    }

    default:
      throw new Error('Unknown workspaceState' + wsPermissionState.type);
  }
}

function PermissionModal({ onPermissionGranted, workspace }) {
  const open = useCallback(async () => {
    if (!workspace) {
      throw new Error('workspace not found');
    }

    if (workspace.type !== 'nativefs') {
      onPermissionGranted(true);
      return;
    }

    if (await requestPermission(workspace.metadata.rootDirHandle)) {
      onPermissionGranted(true);
    } else {
      alert('You will need to grant permission to edit ' + workspace.name);
      onPermissionGranted(false);
      return;
    }
  }, [onPermissionGranted, workspace]);

  useEffect(() => {
    let callback = keybindingsHelper({
      Enter: () => {
        open();
        return true;
      },
    });
    document.addEventListener('keydown', callback);
    return () => {
      document.removeEventListener('keydown', callback);
    };
  }, [open]);

  return (
    <div
      className="flex justify-center flex-row h-full align-middle"
      onClick={open}
    >
      <span className="flex-shrink text-lg sm:leading-10 font-medium mb-10 sm:mb-1">
        Press Enter twice or click anywhere to resume working on "
        {workspace.name}""
      </span>
    </div>
  );
}

function usePermissions() {
  const {
    wsName,
    wsPath,
    setWsPermissionState,
    wsPermissionState,
  } = useWorkspacePath();

  const isWsPermissionStateUndefined = Boolean(wsPermissionState.type);

  useEffect(
    () => {
      let unmounted = false;

      if (!wsName) {
        return;
      }

      getWorkspaceInfo(wsName).then((workspace) => {
        if (unmounted) {
          return;
        }
        if (workspace.type === 'browser') {
          setWsPermissionState({ type: 'ready', workspace });
          return;
        }

        if (workspace.type === 'nativefs') {
          hasPermission(workspace.metadata.rootDirHandle).then((permission) => {
            if (unmounted) {
              return;
            }

            if (permission) {
              setWsPermissionState({ type: 'ready', workspace });
            } else {
              setWsPermissionState({ type: 'permission', workspace });
            }
          });
          return;
        }

        setWsPermissionState({
          type: 'error',
          error: new Error('Unknown workspace type'),
        });
      });

      return () => {
        unmounted = true;
      };
    },
    // adding wsPath so that error is reset if path changes
    // add isWsPermissionStateUndefined so that it doest stay in an undefined state forever
    [wsName, wsPath, setWsPermissionState, isWsPermissionStateUndefined],
  );
}

function useHandleErrors() {
  const { wsPermissionState, setWsPermissionState } = useWorkspacePath();

  const errorHandler = useCallback(
    (error) => {
      if (error instanceof BaseFileSystemError) {
        switch (error.code) {
          case UPSTREAM_ERROR: {
            setWsPermissionState({ type: 'error', error: error });
            break;
          }

          case FILE_NOT_FOUND_ERROR: {
            setWsPermissionState({ type: 'error', error: error });
            break;
          }

          case NATIVE_BROWSER_PERMISSION_ERROR: {
            setWsPermissionState({
              type: 'permission',
              workspace: wsPermissionState.workspace,
            });
            break;
          }

          default: {
            console.error(error);
            setWsPermissionState({ type: 'error', error: error });
            throw new Error('Unknown FSError code ' + error.code);
          }
        }
      } else if (error instanceof WorkspaceError) {
        switch (error.code) {
          case WORKSPACE_NOT_FOUND_ERROR: {
            setWsPermissionState({ type: 'error', error });
            break;
          }
          default: {
            console.error(error);
            setWsPermissionState({ type: 'error', error: error });
            throw new Error('Unknown WorkspaceError code ' + error.code);
          }
        }
      } else if (error instanceof RangeError) {
        if (error.message.includes('Unknown node type')) {
          setWsPermissionState({ type: 'error', error: error });
        }
      }
    },
    [wsPermissionState.workspace, setWsPermissionState],
  );

  useCatchError(errorHandler);
}
