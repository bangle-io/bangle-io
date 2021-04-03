import React, { useCallback } from 'react';
import { useWorkspaces } from 'app/workspace/workspace-hooks';
import { WORKSPACE_PALETTE } from '../paletteTypes';
import { CloseIcon } from 'app/helper-ui/Icons';

const LOG = false;

let log = LOG ? console.log.bind(console, 'play/file-palette') : () => {};

export function useWorkspacePalette({ updatePalette }) {
  const { workspaces, switchWorkspace, deleteWorkspace } = useWorkspaces();

  const onExecute = useCallback(
    ({ data }, itemIndex, event) => {
      if (event.metaKey) {
        switchWorkspace(data.workspace.name, true);
        return true;
      } else {
        switchWorkspace(data.workspace.name);
        return true;
      }
    },
    [switchWorkspace],
  );

  return useCallback(
    ({ query, paletteType }) => {
      if (paletteType !== WORKSPACE_PALETTE) {
        return null;
      }

      return workspaces
        .filter((ws) => {
          return strMatch(ws.name, query);
        })
        .map((workspace, i) => {
          return {
            uid: `${workspace.name}-(${workspace.type})`,
            onExecute,
            title: `${workspace.name} (${workspace.type})`,
            data: { workspace },
            rightHoverIcon: (
              <CloseIcon
                style={{
                  height: 16,
                  width: 16,
                }}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (
                    window.confirm(
                      `Are you sure you want to remove "${workspace.name}"? Removing a workspace does not delete any files inside it.`,
                    )
                  ) {
                    await deleteWorkspace(workspace.name);
                    updatePalette({ type: null });
                  }
                }}
              />
            ),
          };
        });
    },
    [onExecute, updatePalette, workspaces, deleteWorkspace],
  );
}

function strMatch(a, b) {
  b = b.toLocaleLowerCase().trim();
  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase().trim();
  return a.includes(b) || b.includes(a);
}
