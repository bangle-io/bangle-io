import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { APP_ENV, IS_PRODUCTION_APP_ENV } from '@bangle.io/config';
import { useWorkspaceContext } from '@bangle.io/workspace-context';
import { getWorkspaceInfo } from '@bangle.io/workspaces';
import { resolvePath } from '@bangle.io/ws-path';

import { saveLastWorkspaceUsed } from './last-workspace-used';

const LOG = false;
let log = LOG ? console.log.bind(console, 'Routes') : () => {};
type UnPromisify<T> = T extends Promise<infer U> ? U : T;

export function useWorkspaceSideEffects() {
  const { wsName, openedWsPaths } = useWorkspaceContext();
  const { primaryWsPath } = openedWsPaths;
  const [workspaceInfo, updateWorkspaceInfo] = useState<
    UnPromisify<ReturnType<typeof getWorkspaceInfo>> | undefined
  >();
  const history = useHistory();

  // Persist workspaceInfo in the history to
  // prevent release of the native browser FS permission
  useEffect(() => {
    if (wsName && workspaceInfo?.type === 'nativefs') {
      log('replace history state');
      replaceHistoryState(history, {
        workspaceInfo: workspaceInfo,
      });
    }
  }, [wsName, workspaceInfo, history]);

  useEffect(() => {
    if (wsName) {
      document.title = primaryWsPath
        ? `${resolvePath(primaryWsPath).fileName} - bangle.io`
        : `${wsName} - bangle.io`;
    } else {
      document.title = 'bangle.io';
    }

    if (!IS_PRODUCTION_APP_ENV) {
      document.title = APP_ENV + ':' + document.title;
    }
  }, [primaryWsPath, wsName]);

  useEffect(() => {
    let destroyed = false;
    if (wsName) {
      getWorkspaceInfo(wsName).then((_workspaceInfo) => {
        if (!destroyed) {
          updateWorkspaceInfo(_workspaceInfo);
        }
      });
    }
    return () => {
      destroyed = true;
    };
  }, [wsName]);

  useEffect(() => {
    if (wsName && workspaceInfo) {
      saveLastWorkspaceUsed(wsName);
    }
  }, [wsName, workspaceInfo]);
}

function replaceHistoryState(history, newState) {
  return history.replace({
    ...history.location,
    state: {
      ...history.location?.state,
      ...newState,
    },
  });
}
