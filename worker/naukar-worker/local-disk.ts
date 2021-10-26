import { DebouncedDisk } from '@bangle.dev/disk';

import { FileOps } from '@bangle.io/workspaces';

export function localDiskSetup(extensionRegistry, appState) {
  const getItem = async (wsPath) => {
    const doc = await FileOps.getDoc(
      wsPath,
      extensionRegistry.specRegistry,
      extensionRegistry.markdownItPlugins,
    );
    return doc;
  };
  const setItem = async (wsPath, doc, version) => {
    await FileOps.saveDoc(wsPath, doc, extensionRegistry.specRegistry);
  };

  return {
    disk: new DebouncedDisk(getItem, setItem, {
      debounceWait: 250,
      debounceMaxWait: 1000,
      onPendingWrites: (size) => {
        appState.appStateValue.hasPendingWrites = size !== 0;
      },
    }),
  };
}
