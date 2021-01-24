import React, { useCallback, useContext, useEffect } from 'react';
import { keybindingsHelper } from '../misc/keybinding-helper';
import { useWorkspacePermission, useWorkspaces } from '../workspace2/Workspace';
import { EditorManagerContext } from '../workspace2/EditorManager';

const NeedsPermission = ({ wsName, requestPermission }) => {
  return (
    <div
      className="flex justify-center flex-row h-full"
      onClick={requestPermission}
    >
      Press Enter twice or click anywhere to resume working on {wsName}
    </div>
  );
};

export function WorkspacePermissionModal({ children }) {
  const {
    editorManagerState: { wsName, wsIsPermissionPromptActive },
  } = useContext(EditorManagerContext);

  const { openWorkspace } = useWorkspaces();
  const [permission, requestPermission] = useWorkspacePermission();

  const active =
    wsIsPermissionPromptActive ||
    permission === 'rejected' ||
    permission === undefined;

  const open = useCallback(() => {
    requestPermission().then((result) => {
      if (result) {
        openWorkspace(wsName, true);
      }
    });
  }, [requestPermission, openWorkspace, wsName]);

  useEffect(() => {
    let callback;
    if (active) {
      callback = keybindingsHelper({
        Enter: () => {
          if (!active) {
            return false;
          }
          open();
          return true;
        },
      });
      document.addEventListener('keydown', callback);
    }
    return () => {
      if (callback) {
        document.removeEventListener('keydown', callback);
        callback = undefined;
      }
    };
  }, [active, open]);

  if (active) {
    return (
      <NeedsPermission
        wsName={wsName}
        requestPermission={open}
        rejected={permission === 'rejected'}
      />
    );
  }

  return children;
}
