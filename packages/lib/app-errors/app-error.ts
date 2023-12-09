import { isPlainObject } from '@bangle.io/mini-js-utils';

export const APP_ERROR_NAME = {
  workspaceNativeFSAuth: 'error::workspace:native-fs-auth',
  workspaceNotFound: 'error::workspace:not-found',
  workspaceCorrupted: 'error::workspace:corrupted',
  workspaceExists: 'error::workspace:exists',

  appDatabaseMiscData: 'error::app-database:misc-data',
  appDatabaseIndexedDB: 'error::app-database:indexeddb',

  fileStorageFileExists: 'error::file-storage:file-exists',
  fileStorageFileNotFound: 'error::file-storage:file-not-found',
  fileStorageInvalidNotePath: 'error::file-storage:invalid-note-path',

  fileOpsNotAllowed: 'error::file-ops:not-allowed',

  userPreferenceInvalidData: 'error::user-preference:invalid-data',

  wsPathValidation: 'error::ws-path:validation',
} as const;

export type AppErrorName = (typeof APP_ERROR_NAME)[keyof typeof APP_ERROR_NAME];

export type AppError =
  | {
      name: (typeof APP_ERROR_NAME)['workspaceNativeFSAuth'];
      payload: {
        wsName: string;
      };
    }
  | {
      name: (typeof APP_ERROR_NAME)['workspaceNotFound'];
      payload: {
        wsName: string;
      };
    }
  | {
      name: (typeof APP_ERROR_NAME)['workspaceCorrupted'];
      payload: {
        wsName: string;
      };
    }
  | {
      name: (typeof APP_ERROR_NAME)['workspaceExists'];
      payload: {
        wsName: string;
      };
    }
  | {
      name: (typeof APP_ERROR_NAME)['appDatabaseMiscData'];
      payload: {
        key: string;
      };
    }
  | {
      name: (typeof APP_ERROR_NAME)['appDatabaseIndexedDB'];
      payload: {
        error: Error;
      };
    }
  | {
      name: (typeof APP_ERROR_NAME)['userPreferenceInvalidData'];
      payload: {
        stringError: string;
      };
    }
  | {
      name: (typeof APP_ERROR_NAME)['fileStorageFileExists'];
      payload: {
        wsPath: string;
      };
    }
  | {
      name: (typeof APP_ERROR_NAME)['fileStorageFileNotFound'];
      payload: {
        wsPath: string;
        fileStorageName: string;
      };
    }
  | {
      name: (typeof APP_ERROR_NAME)['fileStorageInvalidNotePath'];
      payload: {
        invalidWsPath: string;
      };
    }
  | {
      name: (typeof APP_ERROR_NAME)['fileOpsNotAllowed'];
      payload: {
        operation: string;
      };
    }
  | {
      name: (typeof APP_ERROR_NAME)['wsPathValidation'];
      payload: {
        invalidPath: string;
      };
    };

type CauseObject = {
  isBangleError: boolean;
  name: AppErrorName;
  payload: Record<string, Error | number | boolean | string | undefined>;
};

export function throwAppError<TError extends AppErrorName>(
  name: TError,
  message: string,
  payload: Extract<AppError, { name: TError }>['payload'],
): never {
  throw new Error(message, {
    cause: {
      isBangleError: true,
      name,
      payload,
    } satisfies CauseObject,
  });
}

export function handleAppError(
  error: Error,
  handler?: (info: AppError, error: Error) => void,
): boolean {
  if (!(error instanceof Error) || !isPlainObject(error.cause)) {
    return false;
  }

  const cause = error.cause as CauseObject;

  if (cause.isBangleError !== true) {
    return false;
  }

  const { name, payload } = cause;

  const info = { name, payload } as AppError;

  handler?.(info, error);

  return true;
}
