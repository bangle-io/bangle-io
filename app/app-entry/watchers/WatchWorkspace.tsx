import { useEffect, useRef } from 'react';

import { TAB_ID } from '@bangle.io/config';
import {
  refreshWsPaths,
  updateOpenedWsPaths,
  useWorkspaceContext,
} from '@bangle.io/slice-workspace';
import { useBroadcastChannel, weakCache } from '@bangle.io/utils';

const CHANNEL_NAME = 'watch_workspace';
const FILE_TREE_CHANGED = 'FILE_TREE_CHANGED';

const LOG = false;

const log = LOG ? console.log.bind(console, 'WatchWorkspace') : () => {};

const weakComputeLameHash = weakCache((fileWsPaths: string[]) =>
  fileWsPaths.sort((a, b) => a.localeCompare(b)).join(','),
);

interface MessageType {
  type: typeof FILE_TREE_CHANGED;
  tabName: string;
  payload: {
    wsName: string;
    size: number;
    lameHash: string;
  };
}

export function WatchWorkspace() {
  const {
    wsName,
    wsPaths: fileWsPaths,
    bangleStore,
    openedWsPaths,
  } = useWorkspaceContext();
  const [lastMessage, broadcastMessage] =
    useBroadcastChannel<MessageType>(CHANNEL_NAME);
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
            refreshWsPaths()(bangleStore.state, bangleStore.dispatch);
            checkCurrentEditors.current = true;
          }
          break;
        }
        default: {
          throw new Error('Unknown watch workspace message type ' + type);
        }
      }
    }
  }, [lastMessage, bangleStore, wsName, fileWsPaths]);

  // close any tabs that might have been deleted or renamed
  // NOTE: We are doing this rectification here and not
  // useWorkspaceContext because here we know for sure ( due to`checkCurrentEditors`)
  // that an external modification was made. We cannot do the same (check and remove active wsPaths from history)
  // for any internal changes due to race conditions like closing a wsPath which didnt show up in `fileWsPaths` yet.
  useEffect(() => {
    if (fileWsPaths && checkCurrentEditors.current) {
      checkCurrentEditors.current = false;
      updateOpenedWsPaths(
        (openedWsPaths) => {
          let newOpenedWsPaths = openedWsPaths;

          openedWsPaths.forEachWsPath((wsPath) => {
            if (wsPath && !fileWsPaths.includes(wsPath)) {
              newOpenedWsPaths = newOpenedWsPaths.closeIfFound(wsPath);
            }
          });

          return newOpenedWsPaths.optimizeSpace();
        },
        { replace: true },
      )(bangleStore.state, bangleStore.dispatch);
    }
  }, [fileWsPaths, bangleStore, openedWsPaths]);

  useEffect(() => {
    // fileWsPaths is undefined when its loading
    if (!isFirstMountRef.current && fileWsPaths && wsName) {
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
