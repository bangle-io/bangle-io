import { Extension } from '@bangle.io/extension-registry';
import { showNotification } from '@bangle.io/slice-notification';
import {
  IndexedDbStorageProvider,
  isIndexedDbException,
} from '@bangle.io/storage';

import { browserStorageSlice } from './browser-storage-slice';

const extensionName = '@bangle.io/browser-storage';

const extension = Extension.create({
  name: extensionName,
  application: {
    slices: [browserStorageSlice()],
    storageProvider: new IndexedDbStorageProvider(),
    onStorageError: (error, store) => {
      if (isIndexedDbException(error)) {
        console.debug(error.code, error.name);
        showNotification({
          severity: 'error',
          title: 'Error writing to browser storage',
          content: error.message,
          uid: error.code + Math.random(),
        })(store.state, store.dispatch);
        return true;
      }

      showNotification({
        severity: 'error',
        title: `Browser storage provider encountered an unknown error: ${error.name}`,
        uid: 'unknown-error' + error.code || error.name + Math.random(),
      })(store.state, store.dispatch);

      return false;
    },
  },
});

export default extension;
