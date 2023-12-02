import { cleanup, createKey } from '@nalanda/core';

import { getStoreConfigRef } from '@bangle.io/naukar-common';
import { Workspace } from '@bangle.io/workspace';

import { logger } from '../logger';
import { sliceWindowState } from './slice-window-state';

// WARNING: If changing also make changes to slice-workspace
const key = createKey('slice-workspace-naukar', [sliceWindowState]);

const rawWorkspaceField = key.field<Workspace | undefined>(undefined);

const currentWorkspace = key.derive((state) => {
  const wsName = sliceWindowState.getField(state, 'wsName');
  const rawWorkspace = rawWorkspaceField.get(state);

  if (!wsName || !rawWorkspace) {
    return undefined;
  }

  return rawWorkspace.wsName === wsName ? rawWorkspace : undefined;
});

key.effect(async function workspaceInit(store) {
  const { wsName } = sliceWindowState.track(store);

  if (!wsName) {
    return;
  }

  const eternalVars = getStoreConfigRef(store).current.eternalVars;

  const workspace = await Workspace.create({
    wsName,
    database: eternalVars.appDatabase,
  });

  store.dispatch(rawWorkspaceField.update(workspace));

  cleanup(store, () => {
    workspace.destroy();
  });
});

export const sliceWorkspaceNaukar = key.slice({
  currentWorkspace,
});
