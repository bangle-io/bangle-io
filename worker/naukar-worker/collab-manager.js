import { DebouncedDisk } from '@bangle.dev/disk';
import { Manager } from '@bangle.dev/collab-server';
import { getFileLastModified, getNote, saveNote } from 'workspace/index';

const SLOW_FACTOR = 1;

export function setupCollabManager(bangleIOContext) {
  const manager = new Manager(bangleIOContext.specRegistry.schema, {
    disk: localDisk(bangleIOContext),
    collectUsersTimeout: SLOW_FACTOR * 700,
    userWaitTimeout: SLOW_FACTOR * 500,
    instanceCleanupTimeout: SLOW_FACTOR * 2000,
  });
  return manager;
}

function localDisk(
  bangleIOContext,
  defaultContent = {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: {
          level: 2,
        },
        content: [
          {
            type: 'text',
            text: 'Hi there,',
          },
        ],
      },
    ],
  },
) {
  const getItem = async (wsPath) => {
    const doc = await getNote(bangleIOContext, wsPath);

    return doc;
  };
  const setItem = async (wsPath, doc) => {
    await saveNote(bangleIOContext, wsPath, doc);
  };
  return new DebouncedDisk(getItem, setItem, {
    debounceWait: 250,
    debounceMaxWait: 1000,
  });
}
