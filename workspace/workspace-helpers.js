import { helpFSWorkspaceInfo, HELP_FS_WORKSPACE_TYPE } from 'config/help-fs';
import * as idb from 'idb-keyval';
import {
  WorkspaceError,
  WORKSPACE_NOT_FOUND_ERROR,
  WORKSPACE_ALREADY_EXISTS_ERROR,
} from './errors';
import { validWsName } from './path-helpers';

/**
 * This function exists to retain the instance of the wsInfo (in particular rootDirHandler)
 * We have a lot of caches that depend on uniqueness (a === b checks) of rootDirHandler
 * if we simply return the rootDirHandler from idb everytime, we get a new instance of the
 * handler everytime, hence messing up with downstream weakcaches.
 */
function listWorkspacesHigherOrder() {
  let workspaces = [];
  return async () => {
    let currentWorkspaces = (await idb.get('workspaces/2')) || [];
    currentWorkspaces = currentWorkspaces.map((cWsInfo) => {
      const existingWsInfo = workspaces.find(
        (wsInfo) => wsInfo.name === cWsInfo.name,
      );
      if (existingWsInfo) {
        return existingWsInfo;
      }
      return cWsInfo;
    });

    // because we save the entire array in one indexedDb key, the helpfs
    // will also get saved. This removes it so that we can add in a predictable way.
    currentWorkspaces = currentWorkspaces.filter(
      (f) => f.type !== HELP_FS_WORKSPACE_TYPE,
    );
    currentWorkspaces.push(helpFSWorkspaceInfo);
    workspaces = currentWorkspaces;
    return currentWorkspaces;
  };
}

export const listWorkspaces = listWorkspacesHigherOrder();

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
  await idb.set('workspaces/2', workspaces);
}
