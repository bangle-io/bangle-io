import { IndexedDBFileSystem, NativeBrowserFileSystem } from 'baby-fs';

export const getFileSystemFromWsInfo = (wsInfo) => {
  if (wsInfo.type === 'browser') {
    return new IndexedDBFileSystem();
  }

  if (wsInfo.type === 'nativefs') {
    const rootDirHandle = wsInfo.metadata.rootDirHandle;
    return new NativeBrowserFileSystem({
      rootDirHandle: rootDirHandle,
      allowedFile: (fileHandle) =>
        fileHandle.name.endsWith('.md') || fileHandle.name.endsWith('.png'),
    });
  }

  throw new Error('Unknown workspace type ' + wsInfo.type);
};
