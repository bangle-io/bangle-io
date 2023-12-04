import { createKey } from '@nalanda/core';

import { getWindowStoreConfig } from '@bangle.io/lib-common';
import { WorkspaceInfo } from '@bangle.io/shared-types';

const key = createKey('slice-workspaces', []);

const refreshCounterField = key.field(0);

const workspacesField = key.field<WorkspaceInfo[] | undefined>(undefined);

function refreshWorkspaces() {
  return refreshCounterField.update((c) => c + 1);
}

key.effect(async (store) => {
  // change of refresh helps re-run this effect
  const refresh = refreshCounterField.track(store);

  const { eternalVars } = getWindowStoreConfig(store);

  const workspaces = await eternalVars.appDatabase.getAllWorkspaces();

  store.dispatch(workspacesField.update(workspaces));
});

export const sliceWorkspaces = key.slice({
  workspaces: workspacesField,
  refreshWorkspaces,
});
