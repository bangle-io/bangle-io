import React, { useCallback } from 'react';
import { useWorkspaces } from 'bangle-io/app/workspace/workspace-hooks';
import { WORKSPACE_PALETTE } from '../paletteTypes';
import { CloseIcon } from 'bangle-io/app/helper-ui/Icons';

const LOG = false;

let log = LOG ? console.log.bind(console, 'play/file-palette') : () => {};

export function useWorkspacePalette({ updatePalette }) {
  const { workspaces, switchWorkspace, deleteWorkspace } = useWorkspaces();

  const onPressEnter = useCallback(
    ({ data }) => {
      switchWorkspace(data.workspace.name);
    },
    [switchWorkspace],
  );

  const onPressMetaEnter = useCallback(
    ({ data }) => {
      switchWorkspace(data.workspace.name, true);
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
            onPressEnter,
            onPressMetaEnter,
            title: `${workspace.name} (${workspace.type})`,
            data: { workspace },
            rightHoverIcon: (
              <CloseIcon
                className="file-browser-button"
                onClick={async (e) => {
                  e.stopPropagation();
                  console.log('clicked');
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
    [
      onPressEnter,
      onPressMetaEnter,
      updatePalette,
      workspaces,
      deleteWorkspace,
    ],
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
