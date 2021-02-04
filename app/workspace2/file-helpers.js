import { IndexDBIO } from './indexdb-io';
import { resolvePath, validatePath } from './path-helpers';
import { getWorkspaceInfo } from './workspace-helpers';

// TODO make this get file
export async function getDoc(wsPath) {
  const { wsName } = resolvePath(wsPath);
  const ws = await getWorkspaceInfo(wsName);

  let file;

  switch (ws.type) {
    case 'browser': {
      file = await IndexDBIO.getFile(wsPath);
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
      file = await IndexDBIO.getFile(wsPath);
      if (!file) {
        throw new Error(`File ${wsPath} not found`);
      }
      file = await IndexDBIO.updateFile(wsPath, {
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
      await IndexDBIO.createFile(wsPath, create());
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
      await IndexDBIO.deleteFile(wsPath);
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
      files = await IndexDBIO.listFiles(wsName);
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
      await IndexDBIO.renameFile(wsPath, newWsPath);
      break;
    }

    default: {
      throw new Error('Unknown workspace type ' + workspace.type);
    }
  }
}
