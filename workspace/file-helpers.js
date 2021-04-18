import { markdownParser, markdownSerializer } from 'editor/index';
import {
  resolvePath,
  validWsName,
  validatePath,
  validateWsFilePath,
} from './path-helpers';
import { getWorkspaceInfo } from './workspace-helpers';
import {
  BaseFileSystemError,
  FILE_NOT_FOUND_ERROR,
  IndexedDBFileSystem,
  NativeBrowserFileSystem,
} from 'baby-fs';
import { listFilesCache } from './native-browser-list-fs-cache';

const toFSPath = (wsPath) => {
  const { wsName, filePath } = resolvePath(wsPath);
  return [wsName, filePath].join('/');
};

const getFS = (ws) => {
  if (ws.type === 'browser') {
    return new IndexedDBFileSystem();
  }

  if (ws.type === 'nativefs') {
    return new NativeBrowserFileSystem({
      rootDirHandle: ws.metadata.rootDirHandle,
      allowedFile: (fileHandle) => fileHandle.name.endsWith('.md'),
    });
  }

  throw new Error('Unknown workspace type ' + ws.type);
};

export async function checkFileExists(wsPath) {
  const { wsName } = resolvePath(wsPath);
  const workspaceInfo = await getWorkspaceInfo(wsName);

  const path = toFSPath(wsPath);
  try {
    await getFS(workspaceInfo).stat(path);
    return true;
  } catch (error) {
    if (
      error instanceof BaseFileSystemError &&
      error.code === FILE_NOT_FOUND_ERROR
    ) {
      return false;
    }
    throw error;
  }
}

// TODO make this get file
export async function getDoc(wsPath) {
  const { wsName } = resolvePath(wsPath);
  const workspaceInfo = await getWorkspaceInfo(wsName);

  let file;

  const path = toFSPath(wsPath);
  let fileData = await getFS(workspaceInfo).readFile(path);

  if (path.endsWith('.json')) {
    file = JSON.parse(fileData);
  } else if (path.endsWith('.md')) {
    // TODO avoid doing toJSON
    file = markdownParser(fileData).toJSON();
  }

  if (file === undefined) {
    throw new Error(`File ${wsPath} not found`);
  }

  return file;
}

/**
 *
 * @param {string} wsPath
 * @param {PMNode} doc
 */
export async function saveDoc(wsPath, doc) {
  const { wsName, filePath } = resolvePath(wsPath);
  const workspaceInfo = await getWorkspaceInfo(wsName);

  const path = toFSPath(wsPath);
  let data;
  if (filePath.endsWith('.md')) {
    data = markdownSerializer(doc);
  } else if (filePath.endsWith('.json')) {
    data = JSON.stringify(doc.toJSON());
  } else {
    throw new Error('Unknown file extension ' + filePath);
  }
  await getFS(workspaceInfo).writeFile(path, data);
}

/**
 *
 * @param {*} wsPath
 * @param {*} content
 * @param {'doc'|'markdown'} contentType
 */
export async function createFile(wsPath, content, contentType = 'doc') {
  validateWsFilePath(wsPath);
  const { wsName } = resolvePath(wsPath);
  const workspaceInfo = await getWorkspaceInfo(wsName);

  const path = toFSPath(wsPath);
  let markdown;
  if (contentType === 'doc') {
    markdown = markdownSerializer(content);
  } else if (contentType === 'markdown') {
    markdown = content;
  } else {
    throw new Error('Unknown content type');
  }

  await getFS(workspaceInfo).writeFile(path, markdown);
  listFilesCache.deleteEntry(workspaceInfo);
}

export async function deleteFile(wsPath) {
  validatePath(wsPath);

  const { wsName } = resolvePath(wsPath);
  const workspaceInfo = await getWorkspaceInfo(wsName);
  await getFS(workspaceInfo).unlink(toFSPath(wsPath));
  listFilesCache.deleteEntry(workspaceInfo);
}

/**
 * A smart cached version of `listAllFiles` which
 * only recalculates list of all files if there was a
 * modification via the delete, create, rename etc methods.
 * Currently only caches `nativefs` type.
 * @param {*} wsName
 */
export async function cachedListAllFiles(wsName) {
  const workspaceInfo = await getWorkspaceInfo(wsName);

  if (workspaceInfo.type !== 'nativefs') {
    return listAllFiles(wsName);
  }

  const cachedEntry = listFilesCache.getEntry(workspaceInfo);
  if (!cachedEntry) {
    return listAllFiles(wsName);
  }

  return cachedEntry;
}

export async function listAllFiles(wsName) {
  const workspaceInfo = await getWorkspaceInfo(wsName);

  let files = [];

  const rawPaths = await getFS(workspaceInfo).opendirRecursive(wsName);
  files = rawPaths.map((r) => {
    const [_wsName, ...f] = r.split('/');
    validWsName(_wsName);

    return _wsName + ':' + f.join('/');
  });

  const result = files.sort((a, b) => a.localeCompare(b));

  listFilesCache.saveEntry(workspaceInfo, result);

  return result;
}

export async function renameFile(wsPath, newWsPath) {
  validatePath(wsPath);
  validatePath(newWsPath);
  const { wsName } = resolvePath(wsPath);
  const { wsName: newWsName } = resolvePath(newWsPath);

  if (wsName !== newWsName) {
    throw new Error('Workspace name must be the same');
  }

  const workspaceInfo = await getWorkspaceInfo(wsName);

  await getFS(workspaceInfo).rename(toFSPath(wsPath), toFSPath(newWsPath));

  listFilesCache.deleteEntry(workspaceInfo);
}
