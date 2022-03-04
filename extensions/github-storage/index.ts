import {} from '@bangle.io/baby-fs';
import { Extension } from '@bangle.io/extension-registry';
import {
  showNotification,
  uncaughtExceptionNotification,
} from '@bangle.io/slice-notification';
import { isIndexedDbException } from '@bangle.io/storage';

import {
  OPERATION_NEW_GITUB_WORKSPACE,
  OPERATION_UPDATE_GITHUB_TOKEN,
} from './common';
import { Router } from './components/Router';
import {
  ErrorCodesType,
  GITHUB_API_ERROR,
  GITHUB_NOT_SUPPORTED,
  INVALID_GITHUB_CONFIGURATION,
  INVALID_GITHUB_FILE_FORMAT,
  INVALID_GITHUB_RESPONSE,
  INVALID_GITHUB_TOKEN,
} from './errors';
import { GithubStorageProvider } from './github-storage-provider';

const extensionName = '@bangle.io/github-storage';

const extension = Extension.create({
  name: extensionName,
  application: {
    ReactComponent: Router,
    slices: [],
    storageProvider: new GithubStorageProvider(),
    onStorageError: (error, store) => {
      const errorCode = error.code as ErrorCodesType;

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

      switch (errorCode) {
        case GITHUB_API_ERROR: {
          if (error.message.includes('Bad credentials')) {
            showNotification({
              severity: 'error',
              title: 'Bad Github credentials',
              content:
                'Please check your Github token has correct permissions and try again.',
              uid: `github-storage-error-${errorCode}`,
              buttons: [
                {
                  title: 'Update token',
                  hint: `Update your Github token`,
                  operation: OPERATION_UPDATE_GITHUB_TOKEN,
                },
              ],
            })(store.state, store.dispatch);

            break;
          }
          showNotification({
            severity: 'error',
            title: 'Github API error',
            content: error.message,
            uid: `github-storage-error-${errorCode}`,
          })(store.state, store.dispatch);
          break;
        }
        case INVALID_GITHUB_FILE_FORMAT: {
          showNotification({
            severity: 'error',
            title: 'Invalid file format',
            content: error.message,
            uid: `github-file-format`,
          })(store.state, store.dispatch);
          break;
        }
        case INVALID_GITHUB_TOKEN: {
          showNotification({
            severity: 'error',
            title: 'Github token is invalid',
            content: error.message,
            uid: 'Invalid github token',
          })(store.state, store.dispatch);
          break;
        }

        case INVALID_GITHUB_CONFIGURATION: {
          showNotification({
            severity: 'error',
            title: 'Invalid github workspace configuration',
            content: error.message,
            uid: INVALID_GITHUB_CONFIGURATION,
          })(store.state, store.dispatch);
          break;
        }
        case INVALID_GITHUB_RESPONSE: {
          showNotification({
            severity: 'error',
            title: 'Received invalid response from Github',
            content: error.message,
            uid: INVALID_GITHUB_RESPONSE,
          })(store.state, store.dispatch);
          break;
        }

        case GITHUB_NOT_SUPPORTED: {
          showNotification({
            severity: 'error',
            title: 'Not supported',
            content: error.message,
            uid: GITHUB_NOT_SUPPORTED,
          })(store.state, store.dispatch);
          break;
        }

        default: {
          // hack to catch switch slipping
          let val: never = errorCode;

          console.error(error);
          uncaughtExceptionNotification(error)(store.state, store.dispatch);

          return false;
        }
      }

      return true;
    },
    operations: [
      {
        name: OPERATION_NEW_GITUB_WORKSPACE,
        title: 'Github: New READONLY workspace (Experimental)',
      },
      {
        name: OPERATION_UPDATE_GITHUB_TOKEN,
        title: 'Github: Update personal access token',
      },
    ],
    operationHandler() {
      return {
        handle(operation, payload, store) {
          switch (operation.name) {
            default: {
              return false;
            }
          }
        },
      };
    },
  },
});

export default extension;
