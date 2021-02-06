import React, { useCallback, useEffect, useMemo } from 'react';
import { Palette } from '../../ui/Palette';

import { SideBarRow } from '../Aside/SideBarRow';
import { useWorkspaces } from 'bangle-io/app/workspace2/workspace-hooks';
import { useHistory } from 'react-router-dom';

const LOG = false;

let log = LOG ? console.log.bind(console, 'play/file-palette') : () => {};

export function WorkspacePalette({ counter, query, execute, onDismiss }) {
  const { workspaces } = useWorkspaces();
  const workspaceNames = workspaces.map((r) => r.name);
  const items = useMemo(
    () =>
      workspaceNames.filter((ws) => {
        return strMatch(ws, query);
      }),
    [workspaceNames, query],
  );
  const history = useHistory();

  const onExecuteItem = useCallback(
    async (activeItemIndex) => {
      activeItemIndex =
        activeItemIndex == null
          ? Palette.getActiveIndex(counter, items.length)
          : activeItemIndex;

      const workspace = items[activeItemIndex];

      if (!workspace) {
        return;
      }

      history.push('/ws/' + workspace);
      onDismiss();
    },
    [counter, items, onDismiss, history],
  );

  useEffect(() => {
    // parent signals execution by setting execute to true
    // and expects the child to call dismiss once executed
    if (execute === true) {
      onExecuteItem();
    }
  }, [execute, onExecuteItem]);

  return workspaces.map((workspace, i) => (
    <SideBarRow
      key={i}
      isActive={Palette.getActiveIndex(counter, items.length) === i}
      title={`${workspace.name} (${workspace.type})`}
      onClick={() => onExecuteItem(i)}
    />
  ));
}

function strMatch(a, b) {
  b = b.toLocaleLowerCase().trim();
  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase().trim();
  return a.includes(b) || b.includes(a);
}
