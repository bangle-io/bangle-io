import { nsmApi2 } from '@bangle.io/api';
import { SEVERITY } from '@bangle.io/constants';
import { Extension } from '@bangle.io/extension-registry';
import {
  IndexedDbStorageProvider,
  isIndexedDbException,
} from '@bangle.io/storage';

const extensionName = '@bangle.io/browser-storage';

const extension = Extension.create({
  name: extensionName,
  application: {
    storageProvider: new IndexedDbStorageProvider(),
    onStorageError: (error) => {
      if (isIndexedDbException(error)) {
        console.debug(error.code, error.name);

        nsmApi2.ui.showNotification({
          severity: SEVERITY.ERROR,
          title: 'Error writing to browser storage',
          content: error.message,
          uid: error.code + '' + Math.random(),
        });

        return true;
      }

      nsmApi2.ui.showNotification({
        severity: SEVERITY.ERROR,
        title: `Browser storage provider encountered an unknown error: ${error.name}`,
        uid: 'unknown-error' + error.code || error.name + Math.random(),
        buttons: [],
      });

      return false;
    },
  },
});

export default extension;
