import * as idb from 'idb-keyval';

import { AppState } from '@bangle.io/create-store';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import { shallowEqual } from '@bangle.io/utils';

import { workspaceSliceKey } from '../common';
import { HELP_FS_WORKSPACE_NAME, helpFSWorkspaceInfo } from '../help-fs';
import { WorkspaceInfoReg } from '../workspace-slice-state';

export const WORKSPACE_KEY = 'workspaces/2';

export async function readWorkspacesInfoReg(): Promise<WorkspaceInfoReg> {
  let wsInfos: WorkspaceInfo[] = (await idb.get(WORKSPACE_KEY)) || [];

  if (!Array.isArray(wsInfos)) {
    wsInfos = [];
  }

  const reg = Object.fromEntries(
    wsInfos.map((r) => {
      // stopgap for older data struct which didn't have lastModified field
      if (typeof r.lastModified === undefined) {
        r.lastModified = Date.now();
      }
      if (typeof r.deleted === undefined) {
        r.deleted = false;
      }
      return [r.name, r];
    }),
  );

  // inject the permanent help workspace type
  reg[HELP_FS_WORKSPACE_NAME] = helpFSWorkspaceInfo();

  return reg;
}

export async function saveWorkspacesInfo(state: AppState): Promise<void> {
  const workspacesState = workspaceSliceKey.getSliceStateAsserted(state);
  // read existing data so that we do can do a non destructive merge
  let existing = await readWorkspacesInfoReg();

  if (workspacesState.workspacesInfo) {
    existing = mergeWsInfoRegistries(existing, workspacesState.workspacesInfo);
  }

  await idb.set(
    WORKSPACE_KEY,
    Object.values(existing).filter(
      (wsInfo) => wsInfo.name !== HELP_FS_WORKSPACE_NAME,
    ),
  );
}

export function mergeWsInfoRegistries(
  existingReg: WorkspaceInfoReg,
  incomingReg: WorkspaceInfoReg,
) {
  const newReg = Object.assign({}, existingReg);

  Object.entries(incomingReg).forEach(([wsName, wsInfo]) => {
    const existing = existingReg[wsName];
    if (!existing || existing.lastModified < wsInfo.lastModified) {
      newReg[wsName] = wsInfo;
    }
  });

  if (shallowEqual(newReg, existingReg)) {
    return existingReg;
  }

  return newReg;
}
