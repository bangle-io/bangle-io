import { Extension, notification, workspace } from '@bangle.io/api';
import {
  BaseFileSystemError,
  NATIVE_BROWSER_PERMISSION_ERROR,
  NATIVE_BROWSER_USER_ABORTED_ERROR,
  NativeBrowserFileSystemError,
} from '@bangle.io/baby-fs';

import { NativsFsStorageProvider } from './nativefs-storage-provider';

const extensionName = '@bangle.io/browser-nativefs-storage';

const extension = Extension.create({
  name: extensionName,
  application: {
    slices: [],
    storageProvider: new NativsFsStorageProvider(),
    onStorageError: (error, store) => {
      if (
        error.code === NATIVE_BROWSER_PERMISSION_ERROR ||
        error.code === NATIVE_BROWSER_USER_ABORTED_ERROR
      ) {
        const wsName = workspace.getWsName()(store.state);

        if (wsName) {
          workspace.goToWorkspaceAuthRoute(wsName, error.code)(
            store.state,
            store.dispatch,
          );

          return true;
        }
      }

      if (
        error.name === NativeBrowserFileSystemError.name ||
        error.name === BaseFileSystemError.name
      ) {
        console.debug(error.code, error.name, error.stack);
        notification.showNotification({
          severity: 'error',
          title: 'File system error',
          content: error.message,
          uid: 'NativefsStorageProviderError' + Math.random(),
        })(store.state, store.dispatch);

        return true;
      }

      console.log('nativefs didnt handle error', error.name, error.message);

      return false;
    },
  },
});

export default extension;
