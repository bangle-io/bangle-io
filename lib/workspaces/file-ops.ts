import type { Node } from '@bangle.dev/pm';

import {
  BaseFileSystemError,
  DirTypeSystemHandle,
  FILE_NOT_FOUND_ERROR,
  FileTypeSystemHandle,
  GithubReadFileSystem,
  HelpFileSystem,
  IndexedDBFileSystem,
  NativeBrowserFileSystem,
} from '@bangle.io/baby-fs';
import { HELP_DOCS_VERSION } from '@bangle.io/config';
import { markdownParser, markdownSerializer } from '@bangle.io/markdown';
import {
  filePathToWsPath,
  fromFsPath,
  isValidNoteWsPath,
  resolvePath,
  toFSPath,
  validateFileWsPath,
  validateNoteWsPath,
} from '@bangle.io/ws-path';

import { HELP_FS_WORKSPACE_TYPE, WorkspaceInfo } from './types';
import { getWorkspaceInfo } from './workspaces-ops';

export function listAllNotes(wsName: string): Promise<string[]> {
  return listAllFiles(wsName).then((wsPaths) =>
    wsPaths.filter((wsPath) => isValidNoteWsPath(wsPath)),
  );
}
export async function listAllFiles(wsName: string) {
  const workspaceInfo = await getWorkspaceInfo(wsName);

  let files: string[] = [];

  const rawPaths: string[] = await getFileSystemFromWsInfo(
    workspaceInfo,
  ).opendirRecursive(wsName);

  files = rawPaths
    .map((r) => {
      const wsPath = fromFsPath(r);
      return wsPath;
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
    if (error instanceof BaseFileSystemError) {
      if (error.code === FILE_NOT_FOUND_ERROR) {
        return false;
      }
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

export async function getDoc(wsPath: string, specRegistry, markdownItPlugins) {
  validateNoteWsPath(wsPath);

  const fileText = await getFileAsText(wsPath);

  const doc: Node = markdownParser(fileText, specRegistry, markdownItPlugins);

  return doc;
}

export async function getFileAsText(wsPath: string) {
  const { wsName } = resolvePath(wsPath);
  const workspaceInfo = await getWorkspaceInfo(wsName);

  const path = toFSPath(wsPath);

  const fileText = await getFileSystemFromWsInfo(workspaceInfo).readFileAsText(
    path,
  );

  return fileText;
}

export async function getFile(wsPath: string) {
  const { wsName } = resolvePath(wsPath);
  const workspaceInfo = await getWorkspaceInfo(wsName);

  validateFileWsPath(wsPath);

  const path = toFSPath(wsPath);

  const file = await getFileSystemFromWsInfo(workspaceInfo).readFile(path);
  return file;
}

export async function saveDoc(wsPath: string, doc: any, specRegistry) {
  validateNoteWsPath(wsPath);
  const { fileName } = resolvePath(wsPath);
  const data = markdownSerializer(doc, specRegistry);
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
    if (fs instanceof HelpFileSystem) {
      if (!(await fs.isFileModified(toFSPath(wsPath), fileBlob))) {
        return;
      }
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

const allowedFile = (name: string) => {
  return name.endsWith('.md') || name.endsWith('.png');
};

export const getFileSystemFromWsInfo = (wsInfo: WorkspaceInfo) => {
  if (wsInfo.type === 'browser') {
    return new IndexedDBFileSystem();
  }

  if (wsInfo.type === 'github-read-fs') {
    return new GithubReadFileSystem({
      githubToken:
        new URLSearchParams(window.location.search).get('github_token') ||
        localStorage.getItem('github_token'),
      githubOwner: wsInfo.metadata.githubOwner,
      githubRepo: wsInfo.metadata.githubRepo,
      githubBranch: wsInfo.metadata.githubBranch,
      allowedFile,
    });
  }

  if (wsInfo.type === 'nativefs') {
    const rootDirHandle: DirTypeSystemHandle = wsInfo.metadata.rootDirHandle;
    return new NativeBrowserFileSystem({
      rootDirHandle: rootDirHandle,
      allowedFile: (fileHandle: FileTypeSystemHandle) =>
        allowedFile(fileHandle.name),
    });
  }

  if (wsInfo.type === HELP_FS_WORKSPACE_TYPE) {
    return new HelpFileSystem({
      allowLocalChanges: wsInfo.metadata.allowLocalChanges ?? true,
      helpDocsVersion: HELP_DOCS_VERSION,
    });
  }

  throw new Error('Unknown workspace type ' + wsInfo.type);
};
