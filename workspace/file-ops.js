import { markdownParser, markdownSerializer } from 'editor/index';
import {
  resolvePath,
  validWsName,
  validateFileWsPath,
  validateNoteWsPath,
} from './path-helpers';
import { getWorkspaceInfo } from './workspace-helpers';
import { BaseFileSystemError, FILE_NOT_FOUND_ERROR } from 'baby-fs';
import { listFilesCache } from './native-browser-list-fs-cache';
import { getFileSystemFromWsInfo } from './get-fs';

const toFSPath = (wsPath) => {
  const { wsName, filePath } = resolvePath(wsPath);
  return [wsName, filePath].join('/');
};

export async function checkFileExists(wsPath) {
  validateFileWsPath(wsPath);
  const { wsName } = resolvePath(wsPath);
  const workspaceInfo = await getWorkspaceInfo(wsName);

  const path = toFSPath(wsPath);
  try {
    await getFileSystemFromWsInfo(workspaceInfo).stat(path);
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

export async function getNote(bangleIOContext, wsPath) {
  const { wsName } = resolvePath(wsPath);
  const workspaceInfo = await getWorkspaceInfo(wsName);

  validateNoteWsPath(wsPath);

  const path = toFSPath(wsPath);

  let fileText = await getFileSystemFromWsInfo(workspaceInfo).readFileAsText(
    path,
  );

  // TODO avoid doing toJSON
  const file = markdownParser(
    fileText,
    bangleIOContext.specRegistry,
    bangleIOContext.markdownItPlugins,
  ).toJSON();

  if (file === undefined) {
    throw new Error(`File ${wsPath} not found`);
  }

  return file;
}

export async function getImageAsBlob(wsPath) {
  const { wsName } = resolvePath(wsPath);
  const workspaceInfo = await getWorkspaceInfo(wsName);

  validateFileWsPath(wsPath);

  const path = toFSPath(wsPath);

  const file = await getFileSystemFromWsInfo(workspaceInfo).readFile(path);

  if (file === undefined) {
    throw new Error(`File ${wsPath} not found`);
  }

  return window.URL.createObjectURL(file);
}

export async function saveNote(bangleIOContext, wsPath, doc) {
  validateNoteWsPath(wsPath);

  const { wsName } = resolvePath(wsPath);
  const workspaceInfo = await getWorkspaceInfo(wsName);

  const path = toFSPath(wsPath);
  const data = markdownSerializer(doc, bangleIOContext.specRegistry);

  await getFileSystemFromWsInfo(workspaceInfo).writeFileAsText(path, data);
}

/**
 *
 * @param {'doc'|'markdown'} contentType
 */
export async function createNote(
  bangleIOContext,
  wsPath,
  content,
  contentType = 'doc',
) {
  validateNoteWsPath(wsPath);
  const { wsName } = resolvePath(wsPath);
  const workspaceInfo = await getWorkspaceInfo(wsName);

  const path = toFSPath(wsPath);
  let markdown;
  if (contentType === 'doc') {
    markdown = markdownSerializer(content, bangleIOContext.specRegistry);
  } else if (contentType === 'markdown') {
    markdown = content;
  } else {
    throw new Error('Unknown content type');
  }

  await getFileSystemFromWsInfo(workspaceInfo).writeFileAsText(path, markdown);
  listFilesCache.deleteEntry(workspaceInfo);
}

export async function deleteFile(wsPath) {
  validateFileWsPath(wsPath);
  const { wsName } = resolvePath(wsPath);
  const workspaceInfo = await getWorkspaceInfo(wsName);
  await getFileSystemFromWsInfo(workspaceInfo).unlink(toFSPath(wsPath));
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

  const rawPaths = await getFileSystemFromWsInfo(
    workspaceInfo,
  ).opendirRecursive(wsName);
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
  validateFileWsPath(wsPath);
  validateFileWsPath(newWsPath);
  const { wsName } = resolvePath(wsPath);
  const { wsName: newWsName } = resolvePath(newWsPath);

  if (wsName !== newWsName) {
    throw new Error('Workspace name must be the same');
  }

  const workspaceInfo = await getWorkspaceInfo(wsName);

  await getFileSystemFromWsInfo(workspaceInfo).rename(
    toFSPath(wsPath),
    toFSPath(newWsPath),
  );

  listFilesCache.deleteEntry(workspaceInfo);
}
