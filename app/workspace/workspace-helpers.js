import React from 'react';
import * as idb from 'idb-keyval';

import { validatePath } from './path-helpers';

/**
 * we need to cache the workspaces because
 * the a lot of our caches depend on uniqueness of rootDirHandler (saved in idb)
 * invalidating cache creates a new instance of rootDirHandler for the same dir
 * and hence messing up with downstream weakcaches.
 */
let cachedWorkspaces = undefined;

export async function listWorkspaces() {
  if (!cachedWorkspaces) {
    cachedWorkspaces = (await idb.get('workspaces/2')) || [];
  }

  return cachedWorkspaces;
}

// Workspace
export async function getWorkspaceInfo(wsName) {
  const workspaces = await listWorkspaces();
  const workspaceInfo = workspaces.find(({ name }) => name === wsName);

  if (!workspaceInfo) {
    throw new WorkspaceNotFoundError(
      `Workspace ${wsName} not found`,
      null,
      <span>Workspace "{wsName}" not found.</span>,
    );
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

  cachedWorkspaces = undefined;
  await idb.set('workspaces/2', workspaces);
}

export async function deleteWorkspace(wsName) {
  let workspaces = await listWorkspaces();

  if (!workspaces.find((w) => w.name === wsName)) {
    throw new Error(`Workspace ${wsName} does not exist`);
  }

  workspaces = workspaces.filter((w) => w.name !== wsName);
  cachedWorkspaces = undefined;
  await idb.set('workspaces/2', workspaces);
}

export class WorkspaceError extends Error {
  /**
   *
   * @param {*} message
   * @param {*} src
   * @param {*} displayMessage - one that will be shown to the user, generally a non fatal error
   */
  constructor(message, src, displayMessage) {
    // 'Error' breaks prototype chain here
    super(message);
    // restore prototype chain
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }

    if (src) {
      console.log('original error');
      console.error(src);
      this.src = src;
    }

    this.name = this.constructor.name;
    this.displayMessage = displayMessage;
  }
}

export class WorkspaceNotFoundError extends WorkspaceError {}
