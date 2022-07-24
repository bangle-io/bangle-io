import type { OpenedFile, WorkspaceOpenedDocInfoAction } from './common';
import {
  BULK_UPDATE_SHAS,
  UPDATE_ENTRY,
  workspaceOpenedDocInfoKey,
} from './common';

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

export function bulkUpdateCurrentDiskShas(
  data: Extract<
    WorkspaceOpenedDocInfoAction,
    { name: typeof BULK_UPDATE_SHAS }
  >['value']['data'],
) {
  return workspaceOpenedDocInfoKey.op((state, dispatch) => {
    dispatch({
      name: BULK_UPDATE_SHAS,
      value: { data },
    });

    return true;
  });
}

export function getOpenedDocInfo() {
  return workspaceOpenedDocInfoKey.queryOp((state) => {
    return workspaceOpenedDocInfoKey.getSliceStateAsserted(state).openedFiles;
  });
}
