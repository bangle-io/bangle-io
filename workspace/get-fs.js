import { IndexedDBFileSystem, NativeBrowserFileSystem } from 'baby-fs';
import { resolvePath } from './path-helpers';

export const toFSPath = (wsPath) => {
  const { wsName, filePath } = resolvePath(wsPath);
  return [wsName, filePath].join('/');
};

export const getFileSystemFromWsInfo = (ws) => {
  if (ws.type === 'browser') {
    return new IndexedDBFileSystem();
  }

  if (ws.type === 'nativefs') {
    return createNativeBrowserFileSystem({
      rootDirHandle: ws.metadata.rootDirHandle,
    });
  }

  throw new Error('Unknown workspace type ' + ws.type);
};

export const createNativeBrowserFileSystem = ({ rootDirHandle }) => {
  return new NativeBrowserFileSystem({
    rootDirHandle: rootDirHandle,
    allowedFile: (fileHandle) => fileHandle.name.endsWith('.md'),
  });
};
