import { cleanup, createKey } from '@nalanda/core';

import { getWindowStoreConfig } from '@bangle.io/lib-common';
import { WorkspaceInfo } from '@bangle.io/shared-types';

const key = createKey('slice-workspaces', []);

const refreshCounterField = key.field(0);

const workspacesField = key.field<WorkspaceInfo[] | undefined>(undefined);

function refreshWorkspaces() {
  return refreshCounterField.update((c) => c + 1);
}

key.effect((store) => {
  const { eternalVars } = getWindowStoreConfig(store);

  const refresh = () => {
    store.dispatch(refreshWorkspaces());
  };

  let cleanups: (() => void)[] = [
    eternalVars.emitter.on('@event::database:workspace-create', () => {
      refresh();
    }),
    eternalVars.emitter.on('@event::database:workspace-update', () => {
      refresh();
    }),
    eternalVars.emitter.on('@event::database:workspace-delete', () => {
      refresh();
    }),
  ];

  cleanup(store, () => {
    cleanups.forEach((c) => c());
  });
});

key.effect(async (store) => {
  // change of refresh helps re-run this effect
  const refresh = refreshCounterField.track(store);
  const { eternalVars } = getWindowStoreConfig(store);
  const workspaces = await eternalVars.appDatabase.getAllWorkspaces();
  store.dispatch(workspacesField.update(workspaces));
});

export const sliceWorkspaces = key.slice({
  workspaces: workspacesField,
});
