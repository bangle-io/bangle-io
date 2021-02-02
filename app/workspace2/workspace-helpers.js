import * as idb from 'idb-keyval';

import { hasPermissions } from '../workspace/native-fs-driver';
import { FileOps } from './io';
const pathValidRegex = /^[0-9a-zA-Z_\-. /:]+$/;
const last = (arr) => arr[arr.length - 1];

export function validatePath(wsPath) {
  if (
    !pathValidRegex.test(wsPath) ||
    wsPath.split('/').some((r) => r.length === 0)
  ) {
    console.log(wsPath);
    throw new Error('Invalid path ' + wsPath);
  }

  if ((wsPath.match(/:/g) || []).length !== 1) {
    throw new Error('Path must have only 1 :');
  }
}

export function resolvePath(wsPath) {
  validatePath(wsPath);
  const [wsName, filePath] = wsPath.split(':');

  const fileName = last(filePath.split('/'));

  return {
    wsName,
    // deprecate docName
    get docName() {
      console.warn('docName is deprecated');
      return fileName;
    },
    filePath,
    fileName: fileName,
  };
}

// TODO make this get file
export async function getDoc(wsPath) {
  const { wsName } = resolvePath(wsPath);
  const ws = await getWorkspaceInfo(wsName);

  let file;

  switch (ws.type) {
    case 'browser': {
      file = await FileOps.getFile(wsPath);
      break;
    }

    default: {
      throw new Error('Unknown workspace type ' + ws.type);
    }
  }

  if (!file) {
    throw new Error(`File ${wsPath} not found`);
  }

  return file.doc;
}

export async function saveDoc(wsPath, doc) {
  const { wsName } = resolvePath(wsPath);
  const ws = await getWorkspaceInfo(wsName);
  const docJson = doc.toJSON();
  let file;

  switch (ws.type) {
    case 'browser': {
      file = await FileOps.getFile(wsPath);
      if (!file) {
        throw new Error(`File ${wsPath} not found`);
      }
      file = await FileOps.updateFile(wsPath, {
        ...file,
        doc: docJson,
      });
      break;
    }

    default: {
      throw new Error('Unknown workspace type ' + ws.type);
    }
  }
}

export async function createFile(wsPath) {
  validatePath(wsPath);
  const { wsName } = resolvePath(wsPath);
  const workspace = await getWorkspaceInfo(wsName);

  const create = () => ({
    name: resolvePath(wsPath).fileName,
    doc: null,
  });
  switch (workspace.type) {
    case 'browser': {
      await FileOps.createFile(wsPath, create());
      break;
    }

    default: {
      throw new Error('Unknown workspace type ' + workspace.type);
    }
  }
}

export async function deleteFile(wsPath) {
  validatePath(wsPath);
  const { wsName } = resolvePath(wsPath);
  const workspace = await getWorkspaceInfo(wsName);
  switch (workspace.type) {
    case 'browser': {
      await FileOps.deleteFile(wsPath);
      break;
    }

    default: {
      throw new Error('Unknown workspace type ' + workspace.type);
    }
  }
}

export async function getFiles(wsName) {
  const ws = await getWorkspaceInfo(wsName);

  let files = [];

  switch (ws.type) {
    case 'browser': {
      files = await FileOps.listFiles(wsName);
      break;
    }

    // case 'nativefs': {
    //   break;
    // }

    default: {
      throw new Error('Unknown workspace type ' + ws.type);
    }
  }

  return files;
}

export async function renameFile(wsPath, newWsPath) {
  console.log(wsPath, newWsPath);
  validatePath(wsPath);
  validatePath(newWsPath);
  const { wsName } = resolvePath(wsPath);
  const { wsName: newWsName } = resolvePath(newWsPath);

  if (wsName !== newWsName) {
    throw new Error('Workspace name must be the same');
  }

  const workspace = await getWorkspaceInfo(wsName);

  switch (workspace.type) {
    case 'browser': {
      await FileOps.renameFile(wsPath, newWsPath);
      break;
    }

    default: {
      throw new Error('Unknown workspace type ' + workspace.type);
    }
  }
}

// Workspace
export async function getWorkspaceInfo(wsName) {
  const workspaces = await listWorkspaces();
  const workspaceInfo = workspaces.find(({ name }) => name === wsName);

  if (!workspaceInfo) {
    throw new Error('Unable to find workspace ' + wsName);
  }

  return workspaceInfo;
}

export async function createWorkspace(wsName, type = 'browser') {
  validatePath(wsName + ':' + 'random_file');

  switch (type) {
    case 'browser': {
      const workspaces = await listWorkspaces();

      if (workspaces.find((w) => w.name === wsName)) {
        throw new Error(`Workspace ${wsName} exist`);
      }

      workspaces.push({
        name: wsName,
        type,
      });

      await idb.set('workspaces/2', workspaces);
      break;
    }

    default: {
      throw new Error('Unknown workspace type ' + type);
    }
  }
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
window.createFile = createFile;
window.deleteFile = deleteFile;
