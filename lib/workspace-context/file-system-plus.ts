/**
 * This whole thing exists so that we can tap into auth errors
 * and do the necessary.
 */

import { FileSystem } from '@bangle.io/workspaces';

export type FileSystemType = ReturnType<typeof fileSystemPlus>;

export function fileSystemPlus(onError: (error: Error) => void) {
  return {
    renameFile: errorWrapper(FileSystem.renameFile, onError),
    deleteFile: errorWrapper(FileSystem.deleteFile, onError),
    getDoc: errorWrapper(FileSystem.getDoc, onError),
    saveDoc: errorWrapper(FileSystem.saveDoc, onError),
    listAllFiles: errorWrapper(FileSystem.listAllFiles, onError),
    checkFileExists: errorWrapper(FileSystem.checkFileExists, onError),
  };
}

function errorWrapper<T extends (...args: any[]) => any>(
  cb: T,
  onError: (error: Error) => void,
) {
  return (...args: Parameters<T>): ReturnType<T> => {
    return cb(...args).catch((error) => {
      if (error instanceof Error) {
        onError(error);
      }
      throw error;
    });
  };
}
