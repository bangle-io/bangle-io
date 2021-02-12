import React, { useEffect, useState, useCallback } from 'react';
import { keybindingsHelper } from '../misc/keybinding-helper';
import {
  hasPermission,
  NativeFSError,
  NativeFSFilePermissionError,
  requestPermission,
} from './nativefs-helpers';
import {
  getWorkspaceInfo,
  WorkspaceError,
  WorkspaceNotFoundError,
} from './workspace-helpers';
import { useWorkspacePath } from './workspace-hooks';

export function Workspace({ children }) {
  const { wsName } = useWorkspacePath();
  const [state, setWorkspaceState] = useState({});

  const errorHandler = useCallback(
    (error) => {
      if (error instanceof NativeFSError) {
        if (error instanceof NativeFSFilePermissionError && state.workspace) {
          setWorkspaceState({ type: 'permission', workspace: state.workspace });
        } else {
          setWorkspaceState({ type: 'error', error: error });
        }
      } else if (error instanceof WorkspaceError) {
        if (error instanceof WorkspaceNotFoundError) {
          setWorkspaceState({ type: 'error', error });
        }
      } else {
        setWorkspaceState({ type: 'error', error: error });
      }
    },
    [state.workspace],
  );

  useCatchError(errorHandler);

  useEffect(() => {
    let unmounted = false;

    getWorkspaceInfo(wsName).then((workspace) => {
      if (unmounted) {
        return;
      }
      if (workspace.type === 'browser') {
        setWorkspaceState({ type: 'ready', workspace });
        return;
      }

      if (workspace.type === 'nativefs') {
        setWorkspaceState({ type: 'permission', workspace });

        hasPermission(workspace.metadata.rootDirHandle).then((permission) => {
          if (unmounted) {
            return;
          }

          if (permission) {
            setWorkspaceState({ type: 'ready', workspace });
          } else {
            setWorkspaceState({ type: 'permission', workspace });
          }
        });
        return;
      }

      setWorkspaceState({
        type: 'error',
        error: new Error('Unknown workspace type'),
      });
    });

    return () => {
      unmounted = true;
    };
  }, [wsName]);

  switch (state.type) {
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
              setWorkspaceState({ type: 'ready', workspace: state.workspace });
            } else {
              setWorkspaceState({
                type: 'permission',
                workspace: state.workspace,
              });
            }
          }}
          workspace={state.workspace}
        />
      );
    }

    case 'error': {
      const { error } = state;
      return (
        <>
          {error.displayMessage ? (
            <span>{error.displayMessage}</span>
          ) : (
            <>
              <span>Encountered an unexpected Error</span>
              <br />
              <span>
                {error.name}: {error.message}
              </span>
              <br />
              <span>
                Please try reloading the page or open a ticket if the issue
                persists
              </span>
            </>
          )}
        </>
      );
    }

    default:
      throw new Error('Unknown workspaceState' + state.type);
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
    <div className="flex justify-center flex-row h-full" onClick={open}>
      Press Enter twice or click anywhere to resume working on {workspace.name}
    </div>
  );
}

function useCatchError(callback) {
  useEffect(() => {
    const errorHandler = async (errorEvent) => {
      let error = errorEvent.error;
      if (errorEvent.promise) {
        try {
          await errorEvent.promise;
        } catch (promiseError) {
          error = promiseError;
        }
      }

      if (!error) {
        return;
      }

      callback(error);
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', errorHandler);
    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', errorHandler);
    };
  }, [callback]);
}
