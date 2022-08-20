import { HELP_FS_WORKSPACE_NAME } from '@bangle.io/constants';
import type { AppState } from '@bangle.io/create-store';
import { getWorkspaceInfoTable } from '@bangle.io/db-app';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import { shallowEqual } from '@bangle.io/utils';

import { helpFSWorkspaceInfo, workspaceSliceKey } from './common';
import type { WorkspaceInfoReg } from './workspace-slice-state';

export const WORKSPACE_KEY = 'workspaces/2';

function processWorkspacesInfo(wsInfos: WorkspaceInfo[]) {
  if (!Array.isArray(wsInfos)) {
    wsInfos = [];
  }

  const reg = Object.fromEntries(
    wsInfos.map((r) => {
      if (typeof r.deleted === 'undefined') {
        r.deleted = false;
      }

      return [r.name, r];
    }),
  );

  // inject the permanent help workspace type
  reg[HELP_FS_WORKSPACE_NAME] = helpFSWorkspaceInfo();

  return reg;
}

export async function readWorkspacesInfoReg(): Promise<WorkspaceInfoReg> {
  const wsInfos = (await getWorkspaceInfoTable().get(WORKSPACE_KEY)) || [];

  return processWorkspacesInfo(wsInfos);
}

export async function saveWorkspacesInfo(state: AppState): Promise<void> {
  const oldValue = (await getWorkspaceInfoTable().get(WORKSPACE_KEY)) || [];

  const workspacesState = workspaceSliceKey.getSliceStateAsserted(state);
  // read existing data so that we do can do a non destructive merge

  let existing = processWorkspacesInfo(oldValue);

  if (workspacesState.workspacesInfo) {
    existing = mergeWsInfoRegistries(existing, workspacesState.workspacesInfo);
  }
  await getWorkspaceInfoTable().put(
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
