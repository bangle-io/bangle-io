import type { OpenedFile } from './common';
import { UPDATE_ENTRY, workspaceOpenedDocInfoKey } from './common';

export function updateDocInfo(
  wsPath: string,
  info: Omit<OpenedFile, 'wsPath'>,
) {
  return workspaceOpenedDocInfoKey.op((state, dispatch) => {
    dispatch({
      name: UPDATE_ENTRY,
      value: { wsPath, info: info },
    });

    return true;
  });
}

export function updateLastKnownDiskSha(wsPath: string, sha: string) {
  return workspaceOpenedDocInfoKey.op((state, dispatch) => {
    dispatch({
      name: UPDATE_ENTRY,
      value: {
        wsPath,
        info: {
          lastKnownDiskSha: sha,
        },
      },
    });

    return true;
  });
}

export function updateCurrentDiskSha(wsPath: string, sha: string) {
  return workspaceOpenedDocInfoKey.op((state, dispatch) => {
    dispatch({
      name: UPDATE_ENTRY,
      value: {
        wsPath,
        info: {
          currentDiskSha: sha,
        },
      },
    });

    return true;
  });
}

export function updateShas(
  wsPath: string,
  {
    currentDiskSha,
    lastKnownDiskSha,
  }: {
    currentDiskSha: string;
    lastKnownDiskSha: string;
  },
) {
  return workspaceOpenedDocInfoKey.op((state, dispatch) => {
    dispatch({
      name: UPDATE_ENTRY,
      value: {
        wsPath,
        info: {
          currentDiskSha,
          lastKnownDiskSha,
        },
      },
    });

    return true;
  });
}

export function getOpenedDocInfo() {
  return workspaceOpenedDocInfoKey.queryOp((state) => {
    return workspaceOpenedDocInfoKey.getSliceStateAsserted(state).openedFiles;
  });
}
