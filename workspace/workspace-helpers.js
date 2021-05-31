import { helpFSWorkspaceInfo, HELP_FS_WORKSPACE_TYPE } from 'config/help-fs';
import { config } from 'config/index';
import * as idb from 'idb-keyval';
import {
  WorkspaceError,
  WORKSPACE_NOT_FOUND_ERROR,
  WORKSPACE_ALREADY_EXISTS_ERROR,
} from './errors';

import { validWsName } from './path-helpers';

/**
 * we need to cache the workspaces because
 * the a lot of our caches depend on uniqueness of rootDirHandler (saved in idb)
 * invalidating cache creates a new instance of rootDirHandler for the same dir
 * and hence messing up with downstream weakcaches.
 */
let cachedWorkspaces = undefined;
export function resetCachedWorkspaces() {
  cachedWorkspaces = undefined;
}

export async function listWorkspaces() {
  if (!cachedWorkspaces || config.isTest) {
    cachedWorkspaces = (await idb.get('workspaces/2')) || [];
  }

  // because we save the entire array in one indexedDb key, the helpfs
  // will also get saved. This removes it so that we can add in a predictable way.
  cachedWorkspaces = cachedWorkspaces.filter(
    (f) => f.type !== HELP_FS_WORKSPACE_TYPE,
  );
  cachedWorkspaces.push(helpFSWorkspaceInfo);
  return cachedWorkspaces;
}

// Workspace
export async function getWorkspaceInfo(wsName) {
  const workspaces = await listWorkspaces();
  const workspaceInfo = workspaces.find(({ name }) => name === wsName);

  if (!workspaceInfo) {
    throw new WorkspaceError(
      `Workspace ${wsName} not found`,
      WORKSPACE_NOT_FOUND_ERROR,
      `Cannot find the workspace ${wsName}`,
    );
  }

  return workspaceInfo;
}

export async function createWorkspace(wsName, type = 'browser', opts = {}) {
  validWsName(wsName);

  const workspaces = await listWorkspaces();

  if (workspaces.find((w) => w.name === wsName)) {
    throw new WorkspaceError(
      `Cannot create "${wsName}" as it already exists`,
      WORKSPACE_ALREADY_EXISTS_ERROR,
    );
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

    case 'github-read-fs': {
      workspace = {
        name: wsName,
        type,
        metadata: {
          githubOwner: opts.githubOwner,
          githubRepo: opts.githubRepo,
          githubBranch: opts.githubBranch,
        },
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

  resetCachedWorkspaces();
  await idb.set('workspaces/2', workspaces);
}

export async function deleteWorkspace(wsName) {
  let workspaces = await listWorkspaces();

  if (!workspaces.find((w) => w.name === wsName)) {
    throw new WorkspaceError(
      `Cannot delete ${wsName} as it does not exist`,
      WORKSPACE_NOT_FOUND_ERROR,
    );
  }

  workspaces = workspaces.filter((w) => w.name !== wsName);
  resetCachedWorkspaces();
  await idb.set('workspaces/2', workspaces);
}
