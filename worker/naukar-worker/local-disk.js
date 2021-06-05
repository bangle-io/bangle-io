import { getNote, saveNote } from 'workspace/index';
import { DebouncedDisk } from '@bangle.dev/disk';

export function localDiskSetup(bangleIOContext, appState) {
  const getItem = async (wsPath) => {
    const doc = await getNote(bangleIOContext, wsPath);
    return doc;
  };
  const setItem = async (wsPath, doc, version) => {
    await saveNote(bangleIOContext, wsPath, doc);
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
