import { cleanup, createKey } from '@nalanda/core';

import { getEternalVarsWindow } from '@bangle.io/lib-common';
import { slicePage } from '@bangle.io/slice-page';
import { Workspace } from '@bangle.io/workspace';

// WARNING: If changing also make changes to slice-workspace-naukar
const key = createKey('slice-workspace', [slicePage]);

const refreshAllFilesCounterField = key.field(0);
const rawWorkspaceField = key.field<Workspace | undefined>(undefined);

const rawAllFilesField = key.field<
  | undefined
  | {
      wsName: string;
      files: string[];
    }
>(undefined);

const currentWorkspaceField = key.derive((state) => {
  const wsName = slicePage.getField(state, 'wsName');
  const rawWorkspace = rawWorkspaceField.get(state);

  if (!wsName || !rawWorkspace) {
    return undefined;
  }

  return rawWorkspace.wsName === wsName ? rawWorkspace : undefined;
});

const currentAllFilesField = key.derive((state) => {
  const rawAllFiles = rawAllFilesField.get(state);

  if (!rawAllFiles) {
    return undefined;
  }

  if (rawAllFiles.wsName !== slicePage.getField(state, 'wsName')) {
    return undefined;
  }

  return rawAllFiles.files;
});

function refreshAllFiles() {
  return refreshAllFilesCounterField.update((c) => c + 1);
}

key.effect(async function workspaceInit(store) {
  const { wsName } = slicePage.track(store);

  if (!wsName) {
    return;
  }

  const eternalVars = getEternalVarsWindow(store);

  const workspace = await Workspace.create({
    wsName,
    database: eternalVars.appDatabase,
    onChange(event) {
      store.dispatch(refreshAllFiles());
    },
  });

  store.dispatch(rawWorkspaceField.update(workspace));

  cleanup(store, () => {
    workspace.destroy();
  });
});

key.effect(async function allFilesInit(store) {
  const workspace = currentWorkspaceField.track(store);
  // to refresh the allFiles list
  const refreshAllFilesCounter = refreshAllFilesCounterField.track(store);

  if (!workspace) {
    const hasData = currentAllFilesField.get(store.state);
    if (hasData) {
      store.dispatch(rawAllFilesField.update(undefined));
    }
    return;
  }

  const controller = new AbortController();

  const files = await workspace.listFiles(controller.signal);

  cleanup(store, () => {
    controller.abort();
  });

  if (workspace.wsName === slicePage.getField(store.state, 'wsName')) {
    store.dispatch(
      rawAllFilesField.update({
        wsName: workspace.wsName,
        files,
      }),
    );
  }
});

export const sliceWorkspace = key.slice({
  workspace: currentWorkspaceField,
  allFiles: currentAllFilesField,
});
