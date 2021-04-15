import { markdownParser, markdownSerializer } from 'editor/index';
import {
  resolvePath,
  validWsName,
  validatePath,
  validateWsFilePath,
} from './path-helpers';
import { getWorkspaceInfo } from './workspace-helpers';
import { IndexedDBFileSystem, NativeBrowserFileSystem } from 'baby-fs';

const toFSPath = (wsPath) => {
  const { wsName, filePath } = resolvePath(wsPath);
  return [wsName, filePath].join('/');
};

const getNBFS = (ws) => {
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

// TODO make this get file
export async function getDoc(wsPath) {
  const { wsName } = resolvePath(wsPath);
  const ws = await getWorkspaceInfo(wsName);

  let file;

  const path = toFSPath(wsPath);
  let fileData = await getNBFS(ws).readFile(path);

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
  const ws = await getWorkspaceInfo(wsName);
  let file;

  const path = toFSPath(wsPath);
  let data;
  if (filePath.endsWith('.md')) {
    data = markdownSerializer(doc);
  } else if (filePath.endsWith('.json')) {
    data = JSON.stringify(doc.toJSON());
  } else {
    throw new Error('Unknown file extension ' + filePath);
  }
  await getNBFS(ws).writeFile(path, data);
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
  const workspace = await getWorkspaceInfo(wsName);

  const path = toFSPath(wsPath);
  let markdown;
  if (contentType === 'doc') {
    markdown = markdownSerializer(content);
  } else if (contentType === 'markdown') {
    markdown = content;
  } else {
    throw new Error('Unknown content type');
  }

  await getNBFS(workspace).writeFile(path, markdown);
}

export async function deleteFile(wsPath) {
  validatePath(wsPath);
  const { wsName } = resolvePath(wsPath);
  const workspace = await getWorkspaceInfo(wsName);
  await getNBFS(workspace).unlink(toFSPath(wsPath));
}

export async function listAllFiles(wsName) {
  const ws = await getWorkspaceInfo(wsName);

  let files = [];

  const rawPaths = await getNBFS(ws).opendirRecursive(wsName);
  files = rawPaths.map((r) => {
    const [_wsName, ...f] = r.split('/');
    validWsName(_wsName);

    return _wsName + ':' + f.join('/');
  });

  return files.sort((a, b) => a.localeCompare(b));
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

  await getNBFS(workspace).rename(toFSPath(wsPath), toFSPath(newWsPath));
}
