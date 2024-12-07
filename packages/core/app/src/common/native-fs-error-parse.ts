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
    title: 'There was an error opening your notes folder.',
    message:
      'Please make sure your notes folder is inside a common location like Documents or Desktop.',
  },
  [ERROR_TYPES.CLICKED_TOO_SOON]: {
    title: "That didn't work",
    message: 'Please try clicking the Browse button again.',
  },
  [ERROR_TYPES.WORKSPACE_AUTH_REJECTED]: {
    title: 'Access was denied',
    message: 'Please allow access to your folder to continue.',
  },
  [ERROR_TYPES.UNKNOWN]: {
    title: 'Unknown error occurred',
    message: 'Please try again or reload the page.',
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
