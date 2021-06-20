import {
  filePathToWsPath,
  isValidNoteWsPath,
  resolvePath,
  toFSPath,
  validateFileWsPath,
  validateNoteWsPath,
  validWsName,
} from 'ws-path';
import { getFileSystemFromWsInfo } from './get-fs';
import { getWorkspaceInfo } from './workspaces-ops';
import { BaseFileSystemError, FILE_NOT_FOUND_ERROR } from 'baby-fs/index';
import { markdownParser, markdownSerializer } from 'markdown/index';
import { HELP_FS_WORKSPACE_TYPE } from './types';
import type { ExtensionRegistry } from 'extension-registry';

export async function listAllFiles(wsName: string) {
  const workspaceInfo = await getWorkspaceInfo(wsName);

  let files: string[] = [];

  const rawPaths: string[] = await getFileSystemFromWsInfo(
    workspaceInfo,
  ).opendirRecursive(wsName);

  files = rawPaths
    .map((r) => {
      const [_wsName, ...f] = r.split('/');
      if (!_wsName) {
        return undefined;
      }
      validWsName(_wsName);

      return _wsName + ':' + f.join('/');
    })
    .filter((r): r is string => Boolean(r));

  const result = files.sort((a, b) => a.localeCompare(b));

  return result;
}

export async function checkFileExists(wsPath: string) {
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

export async function getFileLastModified(wsPath: string) {
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

export async function getNote(
  extensionRegistry: ExtensionRegistry,
  wsPath: string,
) {
  const { wsName } = resolvePath(wsPath);
  const workspaceInfo = await getWorkspaceInfo(wsName);

  validateNoteWsPath(wsPath);

  const path = toFSPath(wsPath);

  const fileText = await getFileSystemFromWsInfo(workspaceInfo).readFileAsText(
    path,
  );

  const doc = markdownParser(
    fileText,
    extensionRegistry.specRegistry,
    extensionRegistry.markdownItPlugins,
  );

  return doc;
}

export async function getFile(wsPath: string) {
  const { wsName } = resolvePath(wsPath);
  const workspaceInfo = await getWorkspaceInfo(wsName);

  validateFileWsPath(wsPath);

  const path = toFSPath(wsPath);

  const file = await getFileSystemFromWsInfo(workspaceInfo).readFile(path);
  return file;
}

export async function saveNote(
  extensionRegistry: ExtensionRegistry,
  wsPath: string,
  doc: any,
) {
  validateNoteWsPath(wsPath);
  const { fileName } = resolvePath(wsPath);
  const data = markdownSerializer(doc, extensionRegistry.specRegistry);
  await saveFile(
    wsPath,
    new File([data], fileName, {
      type: 'text/plain',
    }),
  );
}

export async function saveFile(wsPath: string, fileBlob) {
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

export async function deleteFile(wsPath: string) {
  validateFileWsPath(wsPath);
  const { wsName } = resolvePath(wsPath);
  const workspaceInfo = await getWorkspaceInfo(wsName);
  await getFileSystemFromWsInfo(workspaceInfo).unlink(toFSPath(wsPath));
}

export async function renameFile(wsPath: string, newWsPath: string) {
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
}

/**
 * Copies all files from `wsNameFrom` to `wsNameTo`, overwriting
 * any that already exists in `wsNameTo`. Both the workspaces need to
 * exist.
 * @param {*} wsNameFrom
 * @param {*} wsNameTo
 */
export async function copyWorkspace(wsNameFrom: string, wsNameTo: string) {
  const fileWsPaths = await listAllFiles(wsNameFrom);
  await Promise.all(
    fileWsPaths.map(async (wsPath) => {
      const file = await getFile(wsPath);

      const { filePath } = resolvePath(wsPath);
      const newWsPath = filePathToWsPath(wsNameTo, filePath);
      await saveFile(newWsPath, file);
    }),
  );
  await getWorkspaceInfo(wsNameTo);
}
