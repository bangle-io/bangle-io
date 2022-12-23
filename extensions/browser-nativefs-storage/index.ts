import { Extension, notification, workspace } from '@bangle.io/api';
import {
  CORE_OPERATIONS_OPEN_GITHUB_ISSUE,
  SEVERITY,
} from '@bangle.io/constants';
import {
  BaseFileSystemError,
  NATIVE_BROWSER_PERMISSION_ERROR,
  NATIVE_BROWSER_USER_ABORTED_ERROR,
  NativeBrowserFileSystemError,
  NativeFsStorageProvider,
} from '@bangle.io/storage';

const extensionName = '@bangle.io/browser-nativefs-storage';

const extension = Extension.create({
  name: extensionName,
  application: {
    storageProvider: new NativeFsStorageProvider(),
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
          severity: SEVERITY.ERROR,
          title: 'File system error',
          content: error.message,
          uid: 'NativefsStorageProviderError' + Math.random(),
          buttons: [
            {
              title: 'Report issue',
              hint: `Report an issue on Github`,
              operation: CORE_OPERATIONS_OPEN_GITHUB_ISSUE,
            },
          ],
        })(store.state, store.dispatch);

        return true;
      }

      console.log('nativefs didnt handle error', error.name, error.message);

      return false;
    },
  },
});

export default extension;
