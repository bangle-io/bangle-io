import { TAB_ID } from 'config/index';
import { useRef, useEffect } from 'react';
import { useWorkspacePath } from 'workspace/index';
import { useWorkspaceHooksContext } from 'workspace-hooks/index';
import { weakCache, useBroadcastChannel } from 'utils/index';
const CHANNEL_NAME = 'watch_workspace';
const FILE_TREE_CHANGED = 'FILE_TREE_CHANGED';

const LOG = false;

const log = LOG ? console.log.bind(console, 'WatchWorkspace') : () => {};

const weakComputeLameHash = weakCache((fileWsPaths) =>
  fileWsPaths.sort((a, b) => a.localeCompare(b)).join(','),
);

export function WatchWorkspace() {
  const { fileWsPaths, refreshWsPaths } = useWorkspaceHooksContext();
  const {
    wsName,
    wsPath,
    secondaryWsPath,
    removeWsPath,
    removeSecondaryWsPath,
  } = useWorkspacePath();
  const [lastMessage, broadcastMessage] = useBroadcastChannel(CHANNEL_NAME);
  const isFirstMountRef = useRef(true);
  const checkCurrentEditors = useRef(false);

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
          // no point refereshing if fileWsPaths hasn't loaded
          if (fileWsPaths == null) {
            break;
          }
          if (
            payload.size !== fileWsPaths.length ||
            payload.lameHash !== weakComputeLameHash(fileWsPaths)
          ) {
            log('refreshing wsPaths');
            refreshWsPaths();
            checkCurrentEditors.current = true;
          }
          break;
        }
        default: {
          throw new Error('Unknown watch workspace message type ' + type);
        }
      }
    }
  }, [lastMessage, refreshWsPaths, wsName, fileWsPaths]);

  // close any tabs that might have been deleted
  // NOTE: We are doing this rectification here and not
  // useWorkspaceHooksContext because here we know for sure ( due to`checkCurrentEditors`)
  // that an external modification was made. We cannot do the same (check and remove active wsPaths from history)
  // for any internal changes due to race conditions like closing a wsPath which didnt show up in `fileWsPaths` yet.
  useEffect(() => {
    if (fileWsPaths && checkCurrentEditors.current === true) {
      checkCurrentEditors.current = false;
      if (wsPath && !fileWsPaths.includes(wsPath)) {
        removeWsPath();
      }

      if (secondaryWsPath && !fileWsPaths.includes(secondaryWsPath)) {
        removeSecondaryWsPath();
      }
    }
  }, [
    fileWsPaths,
    wsPath,
    secondaryWsPath,
    removeWsPath,
    removeSecondaryWsPath,
  ]);

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
