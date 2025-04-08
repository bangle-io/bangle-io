import {
  BaseFileSystemError,
  NATIVE_BROWSER_PERMISSION_ERROR,
  NATIVE_BROWSER_USER_ABORTED_ERROR,
} from '@bangle.io/baby-fs';
import type { DirectoryPickResult } from '@bangle.io/ui-components';
const ERROR_TYPES = {
  ERROR_PICKING_DIRECTORY: 'ERROR_PICKING_DIRECTORY',
  UNKNOWN: 'UNKNOWN_ERROR',
  WORKSPACE_AUTH_REJECTED: 'WORKSPACE_AUTH_REJECTED',
  CLICKED_TOO_SOON: 'CLICKED_TOO_SOON_ERROR',
} as const;

type ErrorType = (typeof ERROR_TYPES)[keyof typeof ERROR_TYPES];

const ERROR_MESSAGES: Record<ErrorType, { title: string; message: string }> = {
  [ERROR_TYPES.ERROR_PICKING_DIRECTORY]: {
    title: t.app.errors.nativeFs.errorOpening.title,
    message: t.app.errors.nativeFs.errorOpening.message,
  },
  [ERROR_TYPES.CLICKED_TOO_SOON]: {
    title: t.app.errors.nativeFs.clickedTooSoon.title,
    message: t.app.errors.nativeFs.clickedTooSoon.message,
  },
  [ERROR_TYPES.WORKSPACE_AUTH_REJECTED]: {
    title: t.app.errors.nativeFs.accessDenied.title,
    message: t.app.errors.nativeFs.accessDenied.message,
  },
  [ERROR_TYPES.UNKNOWN]: {
    title: t.app.errors.nativeFs.unknown.title,
    message: t.app.errors.nativeFs.unknown.message,
  },
};

export function nativeFsErrorParse(error: Error): DirectoryPickResult {
  let errorType: ErrorType;

  if (
    error instanceof Error &&
    error.message.toLowerCase().includes('user activation is required')
  ) {
    errorType = ERROR_TYPES.CLICKED_TOO_SOON;
  } else if (
    error instanceof BaseFileSystemError &&
    (error.code === NATIVE_BROWSER_PERMISSION_ERROR ||
      error.code === NATIVE_BROWSER_USER_ABORTED_ERROR)
  ) {
    errorType = ERROR_TYPES.WORKSPACE_AUTH_REJECTED;
  } else if (error instanceof BaseFileSystemError) {
    errorType = ERROR_TYPES.ERROR_PICKING_DIRECTORY;
  } else {
    errorType = ERROR_TYPES.UNKNOWN;
    console.error('Unknown error during directory pick:', error);
  }

  const message = ERROR_MESSAGES[errorType];
  return {
    type: 'error',
    errorInfo: message,
    error,
  };
}
