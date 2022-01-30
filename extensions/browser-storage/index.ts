import {
  FILE_ALREADY_EXISTS_ERROR,
  FILE_NOT_FOUND_ERROR,
  NOT_A_DIRECTORY_ERROR,
  NOT_ALLOWED_ERROR,
  UPSTREAM_ERROR,
  VALIDATION_ERROR,
} from '@bangle.io/baby-fs';
import { Extension } from '@bangle.io/extension-registry';
import { showNotification } from '@bangle.io/slice-notification';
import { IndexedDbStorageProvider } from '@bangle.io/storage';

import { browserStorageSlice } from './browser-storage-slice';

const extensionName = '@bangle.io/browser-storage';

const extension = Extension.create({
  name: extensionName,
  application: {
    slices: [browserStorageSlice()],
    storageProvider: new IndexedDbStorageProvider(),
    onStorageError: (error, store) => {
      switch (error.code) {
        case VALIDATION_ERROR: {
          showNotification({
            severity: 'error',
            title: 'Invalid data',
            uid: 'VALIDATION_ERROR',
          })(store.state, store.dispatch);
          break;
        }

        case FILE_NOT_FOUND_ERROR: {
          showNotification({
            severity: 'error',
            title: 'File not found',
            uid: 'FILE_NOT_FOUND_ERROR',
          })(store.state, store.dispatch);
          break;
        }

        case UPSTREAM_ERROR: {
          console.error(error);
          showNotification({
            severity: 'error',
            title: 'upstream error',
            uid: 'UPSTREAM_ERROR',
          })(store.state, store.dispatch);
          break;
        }

        case FILE_ALREADY_EXISTS_ERROR: {
          showNotification({
            severity: 'error',
            title: 'File already exists',
            uid: 'FILE_ALREADY_EXISTS_ERROR',
          })(store.state, store.dispatch);
          break;
        }

        case NOT_ALLOWED_ERROR: {
          showNotification({
            severity: 'error',
            title: 'Not allowed',
            uid: 'NOT_ALLOWED_ERROR',
          })(store.state, store.dispatch);
          break;
        }

        case NOT_A_DIRECTORY_ERROR: {
          showNotification({
            severity: 'error',
            title: 'NOT_A_DIRECTORY_ERROR',
            uid: 'NOT_A_DIRECTORY_ERROR',
          })(store.state, store.dispatch);
          break;
        }

        default: {
          console.error(error);
          showNotification({
            severity: 'error',
            title: 'IndexedDB provider encountered an unknown error',
            uid: 'unknown-error',
          })(store.state, store.dispatch);
          return false;
        }
      }

      return true;
    },
  },
});

export default extension;
