import { get as idbGet, set as idbSet } from 'idb-keyval';

import { hasPermissions } from '../workspace/native-fs-driver';
import { BrowserFS, NativeFS } from './io';
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
  const [wsName, filePath] = wsPath.split(':');

  const fileName = last(filePath.split('/'));

  return {
    wsName,
    // deprecate docName
    docName: fileName,
    filePath,
    fileName: fileName,
  };
}

export async function getDoc(wsPath) {
  const { wsName } = resolvePath(wsPath);
  const ws = await getWorkspaceInfo(wsName);

  let file;

  switch (ws.type) {
    case 'browser': {
      file = await BrowserFS.getFile(wsPath);
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
      file = await BrowserFS.getFile(wsPath);
      if (!file) {
        throw new Error(`File ${wsPath} not found`);
      }
      file = await BrowserFS.updateFile(wsPath, {
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
      await BrowserFS.createFile(wsPath, create());
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
      await BrowserFS.deleteFile(wsPath);
      break;
    }

    default: {
      throw new Error('Unknown workspace type ' + workspace.type);
    }
  }
}

export async function getFiles(wsName = 'test3') {
  const ws = await getWorkspaceInfo(wsName);

  let files = [];

  switch (ws.type) {
    case 'browser': {
      files = await BrowserFS.listFiles(wsName);
      break;
    }

    // case 'nativefs': {
    //   break;
    // }

    default: {
      throw new Error('Unknown workspace type ' + ws.type);
    }
  }

  // const workspace = await getWorkspace(wsName);
  // return workspace.files;

  return files;
}

export async function getWorkspaceInfo(wsName) {
  const availableWorkspacesInfo = await getWorkspaces();
  const workspaceInfo = availableWorkspacesInfo.find(
    ({ name }) => name === wsName,
  );

  if (!workspaceInfo) {
    throw new Error('Unable to find workspace ' + wsName);
  }

  return workspaceInfo;
}

export async function createWorkspace(wsName, type) {
  validatePath(wsName + ':' + 'random_file');
  const existing = await getWorkspaces();
  if (existing.find((w) => w.name === wsName)) {
    throw new Error(`A workspace with name ${wsName} already exists`);
  }

  switch (type) {
    case 'browser': {
      await BrowserFS.createWorkspace(wsName);
      break;
    }

    // case 'nativefs': {
    //   break;
    // }

    default: {
      throw new Error('Unknown workspace type ' + type);
    }
  }
}

export async function getWorkspaces() {
  const workspaces = (
    await Promise.all([BrowserFS.listWorkspaces(), NativeFS.listWorkspaces()])
  ).flatMap((r) => r);
  return workspaces;
}

export async function deleteWorkspace(name) {
  let workspaces = await getWorkspaces();

  workspaces = workspaces.filter((w) => w.name !== name);

  await idbSet('workspaces/1', workspaces);
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

window.getWorkspaces = getWorkspaces;
window.idbSet = idbSet;
window.idbGet = idbGet;
window.createFile = createFile;
window.deleteFile = deleteFile;
