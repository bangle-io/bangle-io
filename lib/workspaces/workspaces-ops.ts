import * as idb from 'idb-keyval';

import { validWsName } from '@bangle.io/ws-path';

import {
  WORKSPACE_ALREADY_EXISTS_ERROR,
  WORKSPACE_NOT_FOUND_ERROR,
  WorkspaceError,
} from './errors';
import {
  HELP_FS_WORKSPACE_TYPE,
  helpFSWorkspaceInfo,
  WorkspaceInfo,
  WorkspaceType,
} from './types';

const WORKSPACE_KEY = 'workspaces/2';

/**
 * This function exists to retain the instance of the wsInfo (in particular rootDirHandler)
 * We have a lot of caches that depend on uniqueness (a === b checks) of rootDirHandler
 * if we simply return the rootDirHandler from idb everytime, we get a new instance of the
 * handler everytime, hence messing up with downstream weakcaches.
 */
function listWorkspacesHigherOrder() {
  let workspaces: WorkspaceInfo[] = [];
  return async () => {
    let currentWorkspaces: WorkspaceInfo[] =
      (await idb.get(WORKSPACE_KEY)) || [];

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

export async function getWorkspaceInfo(wsName): Promise<WorkspaceInfo> {
  const workspaces = await listWorkspaces();
  const workspaceInfo = workspaces.find(({ name }) => name === wsName);

  if (!workspaceInfo) {
    throw new WorkspaceError(
      `Workspace ${wsName} not found`,
      WORKSPACE_NOT_FOUND_ERROR,
      `Cannot find the workspace ${wsName}`,
      undefined,
    );
  }

  return workspaceInfo;
}

export async function createWorkspace(
  wsName: string,
  type = WorkspaceType.browser,
  opts: {
    rootDirHandle?: any;
    githubOwner?: string;
    githubRepo?: string;
    githubBranch?: string;
  } = {},
) {
  validWsName(wsName);

  const workspaces = await listWorkspaces();

  if (workspaces.find((w) => w.name === wsName)) {
    throw new WorkspaceError(
      `Cannot create "${wsName}" as it already exists`,
      WORKSPACE_ALREADY_EXISTS_ERROR,
      undefined,
      undefined,
    );
  }

  let workspace: WorkspaceInfo;

  switch (type) {
    case WorkspaceType.browser: {
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

    case WorkspaceType.nativefs: {
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

  await idb.set(WORKSPACE_KEY, workspaces);
}

export async function deleteWorkspace(wsName) {
  let workspaces = await listWorkspaces();

  if (!workspaces.find((w) => w.name === wsName)) {
    throw new WorkspaceError(
      `Cannot delete ${wsName} as it does not exist`,
      WORKSPACE_NOT_FOUND_ERROR,
      undefined,
      undefined,
    );
  }

  workspaces = workspaces.filter((w) => w.name !== wsName);
  await idb.set(WORKSPACE_KEY, workspaces);
}
