import { getDoc, saveDoc } from 'workspaces/index';
import { DebouncedDisk } from '@bangle.dev/disk';

export function localDiskSetup(extensionRegistry, appState) {
  const getItem = async (wsPath) => {
    const doc = await getDoc(
      wsPath,
      extensionRegistry.specRegistry,
      extensionRegistry.markdownItPlugins,
    );
    return doc;
  };
  const setItem = async (wsPath, doc, version) => {
    await saveDoc(wsPath, doc, extensionRegistry.specRegistry);
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
