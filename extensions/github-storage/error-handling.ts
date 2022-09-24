import { notification } from '@bangle.io/api';
import {
  CORE_OPERATIONS_OPEN_GITHUB_ISSUE,
  Severity,
} from '@bangle.io/constants';
import type { ErrorCodeType as RemoteFileSyncErrorCodeType } from '@bangle.io/remote-file-sync';
import { ErrorCode as RemoteSyncErrorCode } from '@bangle.io/remote-file-sync';
import type { BangleApplicationStore } from '@bangle.io/shared-types';
import { isIndexedDbException } from '@bangle.io/storage';
import { BaseError } from '@bangle.io/utils';

import { OPERATION_UPDATE_GITHUB_TOKEN } from './common';
import type { ErrorCodesType } from './errors';
import {
  GITHUB_API_ERROR,
  GITHUB_STORAGE_NOT_ALLOWED,
  INVALID_GITHUB_FILE_FORMAT,
  INVALID_GITHUB_RESPONSE,
  INVALID_GITHUB_TOKEN,
} from './errors';

export function handleError(error: Error, store: BangleApplicationStore) {
  if (!(error instanceof BaseError)) {
    return false;
  }

  const errorCode = error.code as ErrorCodesType | RemoteFileSyncErrorCodeType;

  if (isIndexedDbException(error)) {
    console.debug(error.code, error.name);
    notification.showNotification({
      severity: Severity.ERROR,
      title: 'Error writing to browser storage',
      content: error.message,
      uid: errorCode + Math.random(),
    })(store.state, store.dispatch);

    return true;
  }

  switch (errorCode) {
    case GITHUB_API_ERROR: {
      if (error.message.includes('Bad credentials')) {
        notification.showNotification({
          severity: Severity.ERROR,
          title: 'Bad Github credentials',
          content:
            'Please check your Github token has correct permissions and try again.',
          uid: `github-storage-error-${errorCode}`,
          buttons: [
            {
              title: 'Update token',
              hint: `Update your Github token`,
              operation: OPERATION_UPDATE_GITHUB_TOKEN,
              dismissOnClick: true,
            },
          ],
        })(store.state, store.dispatch);

        break;
      }
      notification.showNotification({
        severity: Severity.ERROR,
        title: 'Github API error',
        content: error.message,
        uid: `github-storage-error-${errorCode}`,
      })(store.state, store.dispatch);
      break;
    }
    case INVALID_GITHUB_FILE_FORMAT: {
      notification.showNotification({
        severity: Severity.ERROR,
        title: 'Invalid file format',
        content: error.message,
        uid: `github-file-format`,
      })(store.state, store.dispatch);
      break;
    }
    case INVALID_GITHUB_TOKEN: {
      notification.showNotification({
        severity: Severity.ERROR,
        title: 'Github token is invalid',
        content:
          'Please check your Github token has correct permissions and try again.',
        uid: `github-storage-error-${errorCode}`,
        buttons: [
          {
            title: 'Update token',
            hint: `Update your Github token`,
            operation: OPERATION_UPDATE_GITHUB_TOKEN,
            dismissOnClick: true,
          },
        ],
      })(store.state, store.dispatch);

      break;
    }

    case INVALID_GITHUB_RESPONSE: {
      notification.showNotification({
        severity: Severity.ERROR,
        title: 'Received invalid response from Github',
        content: error.message,
        uid: INVALID_GITHUB_RESPONSE,
      })(store.state, store.dispatch);
      break;
    }

    case GITHUB_STORAGE_NOT_ALLOWED: {
      notification.showNotification({
        severity: Severity.ERROR,
        title: 'Not allowed',
        content: error.message,
        uid: GITHUB_STORAGE_NOT_ALLOWED + error.message,
      })(store.state, store.dispatch);
      break;
    }

    case RemoteSyncErrorCode.REMOTE_SYNC_NOT_ALLOWED_ERROR: {
      notification.showNotification({
        severity: Severity.ERROR,
        title: 'Not allowed',
        content: error.message,
        uid: RemoteSyncErrorCode.REMOTE_SYNC_NOT_ALLOWED_ERROR + error.message,
      })(store.state, store.dispatch);
      break;
    }

    default: {
      // hack to catch switch slipping
      let val: never = errorCode;

      console.error(error);

      notification.showNotification({
        severity: Severity.ERROR,
        title: 'Bangle.io encountered a problem.',
        uid: `uncaughtExceptionNotification-` + error.name,
        buttons: [
          {
            title: 'Report issue',
            hint: `Report an issue on Github`,
            operation: CORE_OPERATIONS_OPEN_GITHUB_ISSUE,
          },
        ],
        content: error.message,
      })(store.state, store.dispatch);

      return false;
    }
  }

  return true;
}
