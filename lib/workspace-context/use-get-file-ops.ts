/**
 * This whole thing exists so that we can tap into auth errors
 * and do the necessary.
 */

import { FileOps } from '@bangle.io/workspaces';

export type FileOpsType = ReturnType<typeof fileOpsPlus>;

export function fileOpsPlus(onError: (error: Error) => void) {
  return {
    renameFile: errorWrapper(FileOps.renameFile, onError),
    deleteFile: errorWrapper(FileOps.deleteFile, onError),
    getDoc: errorWrapper(FileOps.getDoc, onError),
    saveDoc: errorWrapper(FileOps.saveDoc, onError),
    listAllFiles: errorWrapper(FileOps.listAllFiles, onError),
    checkFileExists: errorWrapper(FileOps.checkFileExists, onError),
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
