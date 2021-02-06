import { markdownParser, markdownSerializer } from '../markdown/parsers';
import { IndexDBIO } from './indexdb-io';
import { NativeFileOps } from './nativefs-helpers';
import { resolvePath, validatePath } from './path-helpers';
import { getWorkspaceInfo } from './workspace-helpers';

const nativeFS = new NativeFileOps({
  allowedFile: (fileHandle) => fileHandle.name.endsWith('.md'),
});

// TODO make this get file
export async function getDoc(wsPath) {
  const { wsName, filePath } = resolvePath(wsPath);
  const ws = await getWorkspaceInfo(wsName);

  let file;

  switch (ws.type) {
    case 'browser': {
      file = (await IndexDBIO.getFile(wsPath)).doc;
      break;
    }

    case 'nativefs': {
      const { rootDirHandle } = ws.metadata;
      const path = [rootDirHandle.name, ...filePath.split('/')];
      const fileData = await nativeFS.readFile(path, rootDirHandle);
      if (fileData.file.type === 'application/json') {
        file = JSON.parse(fileData.textContent);
      } else if (fileData.file.name.endsWith('.md')) {
        // TODO avoid doing toJSON
        file = markdownParser(fileData.textContent).toJSON();
      }
      break;
    }

    default: {
      throw new Error('Unknown workspace type ' + ws.type);
    }
  }

  if (file === undefined) {
    throw new Error(`File ${wsPath} not found`);
  }

  return file;
}

export async function saveDoc(wsPath, doc) {
  const { wsName, filePath } = resolvePath(wsPath);
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

    case 'nativefs': {
      const { rootDirHandle } = ws.metadata;
      const path = [rootDirHandle.name, ...filePath.split('/')];
      let data;
      if (filePath.endsWith('.md')) {
        data = markdownSerializer(doc);
      } else if (filePath.endsWith('.json')) {
        data = JSON.stringify(docJson);
      } else {
        throw new Error('Unknown file extension ' + filePath);
      }

      file = await nativeFS.saveFile(path, rootDirHandle, data);

      break;
    }

    default: {
      throw new Error('Unknown workspace type ' + ws.type);
    }
  }
}

export async function createFile(wsPath) {
  validatePath(wsPath);
  const { wsName, filePath } = resolvePath(wsPath);
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

    case 'nativefs': {
      const { rootDirHandle } = workspace.metadata;
      const path = [rootDirHandle.name, ...filePath.split('/')];
      await nativeFS.saveFile(path, rootDirHandle, JSON.stringify(null));

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

    case 'nativefs': {
      const { rootDirHandle } = ws.metadata;

      const rawPaths = await nativeFS.listFiles(rootDirHandle);

      files = rawPaths.map((fileHandlers) => {
        return (
          wsName +
          ':' +
          fileHandlers
            .slice(1)
            .map((f) => f.name)
            .join('/')
        );
      });
      break;
    }

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
