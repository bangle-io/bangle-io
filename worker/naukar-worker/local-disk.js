import { getNote, saveNote } from 'workspaces/index';
import { DebouncedDisk } from '@bangle.dev/disk';

export function localDiskSetup(extensionRegistry, appState) {
  const getItem = async (wsPath) => {
    const doc = await getNote(extensionRegistry, wsPath);
    return doc;
  };
  const setItem = async (wsPath, doc, version) => {
    await saveNote(extensionRegistry, wsPath, doc);
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
