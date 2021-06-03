import { DebouncedDisk } from '@bangle.dev/disk';
import { Manager } from '@bangle.dev/collab-server';
import { getFileLastModified, getNote, saveNote } from 'workspace/index';

export function setupCollabManager(bangleIOContext) {
  const manager = new Manager(bangleIOContext.specRegistry.schema, {
    disk: localDisk(bangleIOContext),
    collectUsersTimeout: 400,
    userWaitTimeout: 250,
    instanceCleanupTimeout: 500,
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
