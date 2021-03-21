import { useCallback, useMemo } from 'react';
import { useWorkspaces } from 'bangle-io/app/workspace/workspace-hooks';

const LOG = false;

let log = LOG ? console.log.bind(console, 'play/file-palette') : () => {};

export function useWorkspacePalette({ query = '' }) {
  const { workspaces, switchWorkspace } = useWorkspaces();
  const workspacesFiltered = useMemo(
    () =>
      workspaces.filter((ws) => {
        return strMatch(ws.name, query);
      }),
    [workspaces, query],
  );

  const onExecuteItem = useCallback(
    (item) => {
      switchWorkspace(item.data.name);
    },
    [switchWorkspace],
  );

  return {
    onExecuteItem,
    items: workspacesFiltered.map((workspace, i) => {
      return {
        uid: i,
        title: `${workspace.name} (${workspace.type})`,
        data: workspace,
      };
    }),
  };
}

function strMatch(a, b) {
  b = b.toLocaleLowerCase().trim();
  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase().trim();
  return a.includes(b) || b.includes(a);
}
