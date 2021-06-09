import { markdownParser, markdownSerializer } from 'markdown/index';
import {
  resolvePath,
  validWsName,
  validateFileWsPath,
  validateNoteWsPath,
  isValidNoteWsPath,
  filePathToWsPath,
  toFSPath,
} from './path-helpers';
import { getWorkspaceInfo } from './workspace-helpers';
import { BaseFileSystemError, FILE_NOT_FOUND_ERROR } from 'baby-fs/index';
import { listFilesCache } from './native-browser-list-fs-cache';
import { getFileSystemFromWsInfo } from './get-fs';
import { HELP_FS_WORKSPACE_TYPE } from 'config/help-fs';

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

export async function getFileLastModified(wsPath) {
  validateFileWsPath(wsPath);
  const { wsName } = resolvePath(wsPath);
  const workspaceInfo = await getWorkspaceInfo(wsName);

  const path = toFSPath(wsPath);
  try {
    const stat = await getFileSystemFromWsInfo(workspaceInfo).stat(path);
    return stat?.mtimeMs;
  } catch (error) {
    if (
      error instanceof BaseFileSystemError &&
      error.code === FILE_NOT_FOUND_ERROR
    ) {
      return null;
    }
    throw error;
  }
}

export async function getNote(bangleIOContext, wsPath) {
  const { wsName } = resolvePath(wsPath);
  const workspaceInfo = await getWorkspaceInfo(wsName);

  validateNoteWsPath(wsPath);

  const path = toFSPath(wsPath);

  const fileText = await getFileSystemFromWsInfo(workspaceInfo).readFileAsText(
    path,
  );

  const doc = markdownParser(
    fileText,
    bangleIOContext.specRegistry,
    bangleIOContext.markdownItPlugins,
  );

  return doc;
}

export async function getFile(wsPath) {
  const { wsName } = resolvePath(wsPath);
  const workspaceInfo = await getWorkspaceInfo(wsName);

  validateFileWsPath(wsPath);

  const path = toFSPath(wsPath);

  const file = await getFileSystemFromWsInfo(workspaceInfo).readFile(path);
  return file;
}

export async function saveNote(bangleIOContext, wsPath, doc) {
  validateNoteWsPath(wsPath);
  const { fileName } = resolvePath(wsPath);
  const data = markdownSerializer(doc, bangleIOContext.specRegistry);
  await saveFile(
    wsPath,
    new File([data], fileName, {
      type: 'text/plain',
    }),
  );
}

/**
 *
 * @param {*} wsPath
 * @param {*} fileBlob  a blob https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream .write can take
 */
export async function saveFile(wsPath, fileBlob) {
  validateFileWsPath(wsPath);

  const { wsName } = resolvePath(wsPath);
  const workspaceInfo = await getWorkspaceInfo(wsName);
  const path = toFSPath(wsPath);

  const fs = getFileSystemFromWsInfo(workspaceInfo);
  // TODO hack to check if the user actually wrote anything
  if (
    workspaceInfo.type === HELP_FS_WORKSPACE_TYPE &&
    isValidNoteWsPath(wsPath)
  ) {
    if (!(await fs.isFileModified(toFSPath(wsPath), fileBlob))) {
      return;
    }
  }

  await fs.writeFile(path, fileBlob);
}

/**
 *
 * @param {'doc'|'markdown'} contentType
 */
export async function createNote(bangleIOContext, wsPath, content) {
  await saveNote(bangleIOContext, wsPath, content);
}

export async function deleteFile(wsPath) {
  validateFileWsPath(wsPath);
  const { wsName } = resolvePath(wsPath);
  const workspaceInfo = await getWorkspaceInfo(wsName);
  await getFileSystemFromWsInfo(workspaceInfo).unlink(toFSPath(wsPath));
  listFilesCache.deleteEntry(workspaceInfo);
}

// /**
//  * A smart cached version of `listAllFiles` which
//  * only recalculates list of all files if there was a
//  * modification via the delete, create, rename etc methods.
//  * Currently only caches `nativefs` type.
//  * @param {*} wsName
//  */
// export async function cachedListAllFiles(wsName) {
//   const getWsPaths = async (wsName) => {
//     const workspaceInfo = await getWorkspaceInfo(wsName);

//     if (workspaceInfo.type !== 'nativefs') {
//       return listAllFiles(wsName);
//     }

//     const cachedEntry = listFilesCache.getEntry(workspaceInfo);

//     if (!cachedEntry) {
//       return listAllFiles(wsName);
//     }

//     return cachedEntry;
//   };

//   return cachedListAllFilesQueue.add(() => getWsPaths(wsName));
// }

// const weakFilterNoteWsPaths = weakCache((items) =>
//   items.filter((wsPath) => isValidNoteWsPath(wsPath)),
// );

// export async function cachedListAllNoteWsPaths(wsName) {
//   return cachedListAllFiles(wsName).then((items) => {
//     return weakFilterNoteWsPaths(items);
//   });
// }

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

/**
 * Copies all files from `wsNameFrom` to `wsNameTo`, overwriting
 * any that already exists in `wsNameTo`. Both the workspaces need to
 * exist.
 * @param {*} wsNameFrom
 * @param {*} wsNameTo
 */
export async function copyWorkspace(wsNameFrom, wsNameTo) {
  const fileWsPaths = await listAllFiles(wsNameFrom);
  debugger;
  await Promise.all(
    fileWsPaths.map(async (wsPath) => {
      const file = await getFile(wsPath);

      const { filePath } = resolvePath(wsPath);
      const newWsPath = filePathToWsPath(wsNameTo, filePath);
      await saveFile(newWsPath, file);
    }),
  );
  const workspaceInfo = await getWorkspaceInfo(wsNameTo);
  listFilesCache.deleteEntry(workspaceInfo);
}
