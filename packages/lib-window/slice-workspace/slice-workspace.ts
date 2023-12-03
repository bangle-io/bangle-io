import { cleanup, createKey } from '@nalanda/core';

import { getEternalVarsWindow } from '@bangle.io/lib-common';
import { slicePage } from '@bangle.io/slice-page';
import { Workspace } from '@bangle.io/workspace';

// WARNING: If changing also make changes to slice-workspace-naukar
const key = createKey('slice-workspace', [slicePage]);

const rawWorkspaceField = key.field<Workspace | undefined>(undefined);

const currentWorkspace = key.derive((state) => {
  const wsName = slicePage.getField(state, 'wsName');
  const rawWorkspace = rawWorkspaceField.get(state);

  if (!wsName || !rawWorkspace) {
    return undefined;
  }

  return rawWorkspace.wsName === wsName ? rawWorkspace : undefined;
});

key.effect(async function workspaceInit(store) {
  const { wsName } = slicePage.track(store);

  if (!wsName) {
    return;
  }

  const eternalVars = getEternalVarsWindow(store);

  const workspace = await Workspace.create({
    wsName,
    database: eternalVars.appDatabase,
  });

  store.dispatch(rawWorkspaceField.update(workspace));

  cleanup(store, () => {
    workspace.destroy();
  });
});

export const sliceWorkspace = key.slice({
  currentWorkspace,
});
