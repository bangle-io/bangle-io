import { HELP_FS_WORKSPACE_NAME } from '@bangle.io/constants';
import { getWorkspaceInfoTable } from '@bangle.io/db-app';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import { shallowEqual } from '@bangle.io/utils';

import { helpFSWorkspaceInfo } from './common';
import type { WorkspaceInfoReg } from './workspace-slice-state';

const WORKSPACE_KEY = 'workspaces/2';

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

export async function readWorkspaceInfo(
  wsName: string,
  {
    // whether to return if matching workspace info is deleted
    allowDeleted = false,
    type,
  }: {
    type?: WorkspaceInfo['type'];
    allowDeleted?: boolean;
  } = {},
): Promise<WorkspaceInfo | undefined> {
  const wsInfos = (await getWorkspaceInfoTable().get(WORKSPACE_KEY)) || [];

  const match = wsInfos.find((r) => r.name === wsName);

  if (!allowDeleted && match?.deleted) {
    return undefined;
  }

  if (type) {
    return match && match.type === type ? match : undefined;
  }

  return match;
}

export async function readWorkspaceMetadata(
  wsName: string,
  opts?: Parameters<typeof readWorkspaceInfo>[1],
): Promise<WorkspaceInfo['metadata'] | undefined> {
  return (await readWorkspaceInfo(wsName, opts))?.metadata;
}

export async function readWorkspacesInfoReg(): Promise<WorkspaceInfoReg> {
  const wsInfos = (await getWorkspaceInfoTable().get(WORKSPACE_KEY)) || [];

  return processWorkspacesInfo(wsInfos);
}

export async function saveWorkspaceInfo(workspaceInfo: WorkspaceInfo) {
  workspaceInfo = {
    ...workspaceInfo,
    lastModified: Date.now(),
  };
  const wsInfos = await readWorkspacesInfoReg();

  let newWsInfos = mergeWsInfoRegistries(wsInfos, {
    [workspaceInfo.name]: workspaceInfo,
  });

  await getWorkspaceInfoTable().put(
    WORKSPACE_KEY,
    Object.values(newWsInfos).filter(
      (wsInfo) => wsInfo.name !== HELP_FS_WORKSPACE_NAME,
    ),
  );
}

// TODO WSINFO remove this one set ws-info action is gone
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

export async function compareWorkspaceInfo(
  a: WorkspaceInfo,
  b: WorkspaceInfo,
): Promise<boolean> {
  const { metadata: metadataA, ...aWithoutMetadata } = a;
  const { metadata: metadataB, ...bWithoutMetadata } = b;

  if (!shallowEqual(aWithoutMetadata, bWithoutMetadata)) {
    return false;
  }

  if (shallowEqual(a.metadata, b.metadata)) {
    return true;
  }

  // since file handles work differently, we need to compare them individually
  if (Object.keys(a.metadata).length !== Object.keys(b.metadata).length) {
    return false;
  }

  for (const [key, valueA] of Object.entries(a.metadata)) {
    const valueB = b.metadata[key];

    if (
      valueA instanceof FileSystemHandle &&
      valueB instanceof FileSystemHandle
    ) {
      if (!(await valueA.isSameEntry(valueB))) {
        return false;
      }
      continue;
    }

    if (valueA !== valueB) {
      return false;
    }

    continue;
  }

  return true;
}
