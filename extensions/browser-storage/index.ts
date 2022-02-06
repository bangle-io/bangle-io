import { Extension } from '@bangle.io/extension-registry';
import { showNotification } from '@bangle.io/slice-notification';
import {
  IndexedDbStorageError,
  IndexedDbStorageErrorType,
  IndexedDbStorageProvider,
} from '@bangle.io/storage';

import { browserStorageSlice } from './browser-storage-slice';

const extensionName = '@bangle.io/browser-storage';

const extension = Extension.create({
  name: extensionName,
  application: {
    slices: [browserStorageSlice()],
    storageProvider: new IndexedDbStorageProvider(),
    onStorageError: (error, store) => {
      const errorCode = error.code as IndexedDbStorageErrorType;

      switch (errorCode) {
        case IndexedDbStorageError.FILE_NOT_FOUND_ERROR: {
          showNotification({
            severity: 'error',
            title: 'File not found',
            content: error.message,
            uid: 'FILE_NOT_FOUND_ERROR',
          })(store.state, store.dispatch);
          break;
        }

        case IndexedDbStorageError.UPSTREAM_ERROR: {
          console.error(error);
          showNotification({
            severity: 'error',
            title: 'An error occurred with the storage',
            content: error.message,
            uid: 'UPSTREAM_ERROR',
          })(store.state, store.dispatch);
          break;
        }

        case IndexedDbStorageError.FILE_ALREADY_EXISTS_ERROR: {
          showNotification({
            severity: 'error',
            title: 'File already exists',
            uid: 'FILE_ALREADY_EXISTS_ERROR',
          })(store.state, store.dispatch);
          break;
        }

        case IndexedDbStorageError.NOT_ALLOWED_ERROR: {
          showNotification({
            severity: 'error',
            title: 'Not allowed',
            uid: 'NOT_ALLOWED_ERROR',
          })(store.state, store.dispatch);
          break;
        }

        case IndexedDbStorageError.NOT_A_DIRECTORY_ERROR: {
          showNotification({
            severity: 'error',
            title: 'NOT_A_DIRECTORY_ERROR',
            uid: 'NOT_A_DIRECTORY_ERROR',
          })(store.state, store.dispatch);
          break;
        }

        default: {
          // hack to catch switch slipping
          let val: never = errorCode;

          console.error(error);

          showNotification({
            severity: 'error',
            title: `Browser storage provider encountered an unknown error: ${
              val || error.name
            }`,
            uid: 'unknown-error' + val || error.name,
          })(store.state, store.dispatch);
          return false;
        }
      }

      return true;
    },
  },
});

export default extension;
