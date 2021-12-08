/**
 * This whole thing exists so that we can tap into auth errors
 * and do the necessary.
 */
import { useMemo } from 'react';

import {
  BaseFileSystemError,
  NATIVE_BROWSER_PERMISSION_ERROR,
  NATIVE_BROWSER_USER_ABORTED_ERROR,
} from '@bangle.io/baby-fs';
import {
  FileOps,
  WORKSPACE_NOT_FOUND_ERROR,
  WorkspaceError,
} from '@bangle.io/workspaces';

export type FileOpsType = ReturnType<typeof fileOpsPlus>;

export function fileOpsPlus(
  onAuthError: () => void,
  onWorkspaceNotFound: () => void,
) {
  return {
    renameFile: handleErrors(
      FileOps.renameFile,
      onAuthError,
      onWorkspaceNotFound,
    ),
    deleteFile: handleErrors(
      FileOps.deleteFile,
      onAuthError,
      onWorkspaceNotFound,
    ),
    getDoc: handleErrors(FileOps.getDoc, onAuthError, onWorkspaceNotFound),
    saveDoc: handleErrors(FileOps.saveDoc, onAuthError, onWorkspaceNotFound),
    listAllFiles: handleErrors(
      FileOps.listAllFiles,
      onAuthError,
      onWorkspaceNotFound,
    ),
    checkFileExists: handleErrors(
      FileOps.checkFileExists,
      onAuthError,
      onWorkspaceNotFound,
    ),
  };
}

function handleErrors<T extends (...args: any[]) => any>(
  cb: T,
  onAuthNeeded: () => void,
  onWorkspaceNotFound: () => void,
) {
  return (...args: Parameters<T>): ReturnType<T> => {
    return cb(...args).catch((error) => {
      if (
        error instanceof BaseFileSystemError &&
        (error.code === NATIVE_BROWSER_PERMISSION_ERROR ||
          error.code === NATIVE_BROWSER_USER_ABORTED_ERROR)
      ) {
        onAuthNeeded();
      }
      if (
        error instanceof WorkspaceError &&
        error.code === WORKSPACE_NOT_FOUND_ERROR
      ) {
        onWorkspaceNotFound();
      }
      throw error;
    });
  };
}
