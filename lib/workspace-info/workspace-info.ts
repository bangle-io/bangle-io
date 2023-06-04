import { HELP_FS_WORKSPACE_NAME, WorkspaceType } from '@bangle.io/constants';
import {
  getAppDb,
  getWorkspaceInfoTable,
  makeDbRecord,
  WORKSPACE_INFO_TABLE,
} from '@bangle.io/db-app';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import { shallowEqual } from '@bangle.io/utils';

let cachedHelpFs: WorkspaceInfo | undefined = undefined;

export const helpFSWorkspaceInfo = (): WorkspaceInfo => {
  if (!cachedHelpFs) {
    cachedHelpFs = {
      deleted: false,
      metadata: {
        allowLocalChanges: true,
      },
      name: HELP_FS_WORKSPACE_NAME,
      type: WorkspaceType.Help,
      lastModified: Date.now(),
    };
  }

  return cachedHelpFs;
};

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
  let match = await getWorkspaceInfoTable()
    .get(wsName)
    .catch((error) => {
      console.warn('Error reading workspace info from db', error);

      // swallow error as there is not much we can do, and treat it as if
      // workspace was not found
      return undefined;
    });

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

  return await updateWorkspaceInfo(wsName, (existing) => ({
    ...currentWsInfo,
    ...existing,
    metadata: {
      ...(typeof metadata === 'function'
        ? metadata((existing || currentWsInfo).metadata)
        : metadata),
    },
  }));
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

export async function createWorkspaceInfo(
  wsName: string,
  workspaceInfo: WorkspaceInfo,
): Promise<boolean> {
  if (wsName === HELP_FS_WORKSPACE_NAME) {
    return false;
  }

  const db = await getAppDb();

  const tx = db.transaction(WORKSPACE_INFO_TABLE, 'readwrite');

  const objStore = tx.objectStore(WORKSPACE_INFO_TABLE);

  const existing = await objStore.get(wsName);

  if (existing) {
    return false;
  }

  const newInfo: WorkspaceInfo = {
    ...workspaceInfo,
    lastModified: Date.now(),
  };
  await Promise.all([objStore.put(makeDbRecord(wsName, newInfo)), tx.done]);

  return true;
}

export async function updateWorkspaceInfo(
  wsName: string,
  workspaceInfo: (existing: WorkspaceInfo) => WorkspaceInfo,
): Promise<boolean> {
  if (wsName === HELP_FS_WORKSPACE_NAME) {
    return false;
  }

  const db = await getAppDb();

  const tx = db.transaction(WORKSPACE_INFO_TABLE, 'readwrite');

  const objStore = tx.objectStore(WORKSPACE_INFO_TABLE);

  const existing = await objStore.get(wsName);

  if (existing) {
    const newInfo: WorkspaceInfo = {
      ...workspaceInfo(existing.value),
      lastModified: Date.now(),
    };
    await Promise.all([objStore.put(makeDbRecord(wsName, newInfo)), tx.done]);

    return true;
  }

  return false;
}

/**
 * Compares if two workspace info objects are equal.
 * - takes into account FileSystemHandle in metadata
 * - expects metadata to be a flat object
 */
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
