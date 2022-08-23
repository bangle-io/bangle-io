import { HELP_FS_WORKSPACE_NAME } from '@bangle.io/constants';
import {
  getAppDb,
  getWorkspaceInfoTable,
  makeDbRecord,
  WORKSPACE_INFO_TABLE,
} from '@bangle.io/db-app';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import { shallowEqual } from '@bangle.io/utils';

import { helpFSWorkspaceInfo } from './common';

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
  let match = await getWorkspaceInfoTable().get(wsName);

  if (wsName === HELP_FS_WORKSPACE_NAME) {
    match = helpFSWorkspaceInfo();
  }

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

export async function updateWorkspaceMetadata(
  wsName: string,
  metadata: (
    existingMetadata: WorkspaceInfo['metadata'],
  ) => WorkspaceInfo['metadata'],
) {
  const currentWsInfo = await readWorkspaceInfo(wsName);

  if (!currentWsInfo) {
    return false;
  }

  return await saveWorkspaceInfo(
    wsName,
    (existing) => ({
      ...existing,
      metadata: {
        ...(typeof metadata === 'function'
          ? metadata(existing.metadata)
          : metadata),
      },
    }),
    currentWsInfo,
  );
}

export async function readAllWorkspacesInfo(
  opts?: Parameters<typeof readWorkspaceInfo>[1],
): Promise<WorkspaceInfo[]> {
  const wsInfos = (await getWorkspaceInfoTable().getAll()) || [];

  return [
    ...wsInfos
      .filter((wsInfo) => {
        if (opts?.allowDeleted) {
          return true;
        }

        return !wsInfo.deleted;
      })
      .filter((wsInfo) => {
        if (opts?.type) {
          return wsInfo.type === opts.type;
        }

        return true;
      }),
    helpFSWorkspaceInfo(),
  ].sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveWorkspaceInfo(
  wsName: string,
  workspaceInfo: (existing: WorkspaceInfo) => WorkspaceInfo,
  defaultValue: WorkspaceInfo,
) {
  if (wsName === HELP_FS_WORKSPACE_NAME) {
    return false;
  }

  const db = await getAppDb();

  const tx = db.transaction(WORKSPACE_INFO_TABLE, 'readwrite');

  const store = tx.objectStore(WORKSPACE_INFO_TABLE);

  const existing = await store.get(wsName);

  const newInfo: WorkspaceInfo = {
    ...workspaceInfo(existing?.value || defaultValue),
    lastModified: Date.now(),
  };

  await Promise.all([store.put(makeDbRecord(wsName, newInfo)), tx.done]);

  return true;
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
