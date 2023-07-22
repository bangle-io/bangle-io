import { Extension, nsmApi2 } from '@bangle.io/api';
import {
  CORE_OPERATIONS_OPEN_GITHUB_ISSUE,
  SEVERITY,
} from '@bangle.io/constants';
import {
  BaseFileSystemError,
  NATIVE_BROWSER_PERMISSION_ERROR,
  NATIVE_BROWSER_USER_ABORTED_ERROR,
  NativeBrowserFileSystemError,
  PrivateFsStorageProvider,
} from '@bangle.io/storage';

const extensionName = '@bangle.io/browser-privatefs-storage';

const extension = Extension.create({
  name: extensionName,
  application: {
    slices: [],
    storageProvider: new PrivateFsStorageProvider(),
    onStorageError: (error) => {
      if (
        error.code === NATIVE_BROWSER_PERMISSION_ERROR ||
        error.code === NATIVE_BROWSER_USER_ABORTED_ERROR
      ) {
        const wsName = nsmApi2.workspace.workspaceState().wsName;

        if (wsName) {
          nsmApi2.workspace.goToWorkspaceAuthRoute(wsName, error.code);

          return true;
        }
      }

      if (
        error.name === NativeBrowserFileSystemError.name ||
        error.name === BaseFileSystemError.name
      ) {
        console.debug(error.code, error.name, error.stack);
        nsmApi2.ui.showNotification({
          severity: SEVERITY.ERROR,
          title: 'File system error',
          content: error.message,
          uid: 'PrivateFSStorage' + Math.random(),
          buttons: [
            {
              title: 'Report issue',
              hint: `Report an issue on Github`,
              operation: CORE_OPERATIONS_OPEN_GITHUB_ISSUE,
            },
          ],
        });

        return true;
      }

      console.log('nativefs didnt handle error', error.name, error.message);

      return false;
    },
  },
});

export default extension;
