import * as idb from 'idb-keyval';

import { hasPermissions } from '../workspace/native-fs-driver';
import { validatePath } from './path-helpers';

// Workspace
export async function getWorkspaceInfo(wsName) {
  const workspaces = await listWorkspaces();
  const workspaceInfo = workspaces.find(({ name }) => name === wsName);

  if (!workspaceInfo) {
    throw new Error('Unable to find workspace ' + wsName);
  }

  return workspaceInfo;
}

export async function createWorkspace(wsName, type = 'browser', opts = {}) {
  validatePath(wsName + ':' + 'random_file');

  const workspaces = await listWorkspaces();

  if (workspaces.find((w) => w.name === wsName)) {
    throw new Error(`Workspace ${wsName} exist`);
  }

  let workspace = {};

  switch (type) {
    case 'browser': {
      workspace = {
        name: wsName,
        type,
        metadata: {},
      };

      break;
    }

    case 'nativefs': {
      const { rootDirHandle } = opts;
      if (!rootDirHandle) {
        throw new Error(
          `rootDirHandle is necessary for creating ${type} of workspaces`,
        );
      }

      workspace = {
        name: wsName,
        type,
        metadata: {
          rootDirHandle,
        },
      };
      break;
    }

    default: {
      throw new Error('Unknown workspace type ' + type);
    }
  }

  workspaces.push(workspace);

  await idb.set('workspaces/2', workspaces);
}

export async function listWorkspaces() {
  let ws = (await idb.get('workspaces/2')) || [];

  return ws;
}

export async function deleteWorkspace(wsName) {
  let workspaces = await listWorkspaces();

  if (!workspaces.find((w) => w.name === wsName)) {
    throw new Error(`Workspace ${wsName} does not exist`);
  }

  workspaces = workspaces.filter((w) => w.name !== wsName);
  await idb.set('workspaces/2', workspaces);
}

export async function wsQueryPermission(wsName) {
  const workspaceInfo = await getWorkspaceInfo(wsName);
  if (workspaceInfo.type === 'browser') {
    return true;
  }

  if (!workspaceInfo.metadata.dirHandle) {
    return true;
  }
  const result = Boolean(
    await hasPermissions(workspaceInfo.metadata.dirHandle),
  );

  return result;
}

window.getWorkspaces = listWorkspaces;
