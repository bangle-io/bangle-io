import React, { useEffect, useState, useCallback } from 'react';
import { keybindingsHelper } from '../misc/keybinding-helper';
import { hasPermission, requestPermission } from './nativefs-helpers';
import { getWorkspaceInfo } from './workspace-helpers';
import { useWorkspaceDetails } from './workspace-hooks';

export function Workspace({ children }) {
  const { wsName } = useWorkspaceDetails();
  const [state, setWorkspaceState] = useState({});

  useEffect(() => {
    let unmounted = false;

    getWorkspaceInfo(wsName)
      .then((workspace) => {
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
      })
      .catch((error) => {
        if (unmounted) {
          return;
        }
        setWorkspaceState({ type: 'error', error });
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
      return <span>Encountered Error {error.name}</span>;
    }

    default:
      throw new Error('Unknown workspaceState' + state.type);
  }
}

function PermissionModal({ onPermissionGranted, workspace }) {
  const open = useCallback(async () => {
    if (!workspace) {
      throw new Error(' workspace not found');
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
