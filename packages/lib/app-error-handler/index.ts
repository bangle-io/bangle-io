import {
  APP_ERROR_NAME,
  AppError,
  handleAppError,
} from '@bangle.io/app-errors';
import { APP_DIALOG_NAME, AppDialog } from '@bangle.io/dialog-maker';
import { ToastRequest } from '@bangle.io/shared-types';

export function appErrorHandler(
  error: unknown,
  showDialog: (dialog: AppDialog) => void,
  showToast: (toast: ToastRequest) => void,
): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return handleAppError(error, (info) => {
    switch (info.name) {
      case APP_ERROR_NAME.workspaceNativeFSAuth: {
        showDialog({
          name: APP_DIALOG_NAME.workspaceAuthNativeFS,
          payload: {
            workspaceName: info.payload.wsName,
          },
        });
        break;
      }
      // Add handling for other errors
      case APP_ERROR_NAME.workspaceNotFound:
      case APP_ERROR_NAME.workspaceCorrupted:
      case APP_ERROR_NAME.workspaceExists: {
        showToast({
          label: `${error.message}`,
          type: 'negative',
        });
        break;
      }
      case APP_ERROR_NAME.appDatabaseMiscData:
      case APP_ERROR_NAME.appDatabaseIndexedDB: {
        // Show dialog or toast for app database errors
        showToast({
          label: `Database Error: ${error.message}`,
          type: 'negative',
        });
        break;
      }
      case APP_ERROR_NAME.fileStorageFileExists:
      case APP_ERROR_NAME.fileStorageFileNotFound:
      case APP_ERROR_NAME.fileStorageInvalidNotePath: {
        showToast({
          label: `${error.message}`,
          type: 'negative',
        });
        break;
      }
      case APP_ERROR_NAME.fileOpsNotAllowed: {
        showToast({
          label: `${error.message}`,
          type: 'negative',
        });
        break;
      }
      case APP_ERROR_NAME.userPreferenceInvalidData: {
        showToast({
          label: `${error.message}`,
          type: 'negative',
        });
        break;
      }
      default: {
        let x: never = info;
        return false;
      }
    }

    return true;
  });
}
