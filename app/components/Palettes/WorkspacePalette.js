import React, { useCallback, useEffect, useMemo } from 'react';
import { Palette } from '../../ui/Palette';

import { SideBarRow } from '../Aside/SideBarRow';
import { useWorkspaces } from 'bangle-io/app/workspace2/workspace-hooks';
import { useHistory } from 'react-router-dom';

const LOG = false;

let log = LOG ? console.log.bind(console, 'play/file-palette') : () => {};

export function WorkspacePalette({ counter, query, execute, onDismiss }) {
  const { workspaces } = useWorkspaces();
  const items = useMemo(
    () =>
      workspaces.filter((ws) => {
        return strMatch(ws, query);
      }),
    [workspaces, query],
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

  return items.map((item, i) => (
    <SideBarRow
      key={i}
      isActive={Palette.getActiveIndex(counter, items.length) === i}
      title={item}
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
