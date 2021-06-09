import { TAB_ID } from 'config/index';
import { useRef } from 'react';
import { useEffect, useState } from 'react/cjs/react.development';
import { useWorkspacePath } from 'workspace';
import { useWorkspaceHooksContext } from 'workspace-hooks/index';
import { weakCache, useBroadcastChannel } from 'utils/index';
const channelNamePrefix = 'watch_workspace';
const FILE_TREE_CHANGED = 'FILE_TREE_CHANGED';

const LOG = false;

const log = LOG ? console.log.bind(console, 'WatchWorkspace') : () => {};

const weakComputeLameHash = weakCache((fileWsPaths) =>
  fileWsPaths.sort((a, b) => a.localeCompare(b)).join(','),
);

export function WatchWorkspace() {
  const { fileWsPaths, refreshWsPaths } = useWorkspaceHooksContext();
  const { wsName } = useWorkspacePath();
  const [lastMessage, broadcastMessage] =
    useBroadcastChannel(channelNamePrefix);
  const isFirstMountRef = useRef(true);

  useEffect(() => {
    if (lastMessage) {
      const { type, tabName, payload } = lastMessage;
      if (payload.wsName !== wsName) {
        log('different wsName', payload.wsName);
        return;
      }
      log('received from', tabName, 'type =', type, payload.size);
      switch (type) {
        case FILE_TREE_CHANGED: {
          if (!fileWsPaths) {
            refreshWsPaths();
            break;
          }
          if (
            payload.size !== fileWsPaths.length ||
            payload.lameHash !== weakComputeLameHash(fileWsPaths)
          ) {
            log('refreshing wsPaths');
            refreshWsPaths();
          }
          break;
        }
        default: {
          throw new Error('Unknown watch workspace message type ' + type);
        }
      }
    }
  }, [lastMessage, refreshWsPaths, wsName, fileWsPaths]);

  useEffect(() => {
    // fileWsPaths is undefined when its loading
    if (!isFirstMountRef.current && fileWsPaths) {
      log('sending update', 'type =', FILE_TREE_CHANGED);
      broadcastMessage({
        type: FILE_TREE_CHANGED,
        tabName: TAB_ID,
        payload: {
          wsName,
          size: fileWsPaths.length,
          lameHash: weakComputeLameHash(fileWsPaths),
        },
      });
    }
  }, [fileWsPaths, broadcastMessage, wsName]);

  useEffect(() => {
    isFirstMountRef.current = false;
  }, []);

  return null;
}
