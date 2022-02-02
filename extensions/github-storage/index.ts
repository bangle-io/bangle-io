import {} from '@bangle.io/baby-fs';
import { Extension } from '@bangle.io/extension-registry';
import {
  showNotification,
  uncaughtExceptionNotification,
} from '@bangle.io/slice-notification';
import { IndexedDbStorageError } from '@bangle.io/storage';

import { OPERATION_NEW_GITUB_WORKSPACE } from './common';
import { GithubStorageComponent } from './components/GithubStorageComponent';
import {
  ErrorCodesType,
  GITHUB_API_ERROR,
  INVALID_GITHUB_CONFIGURATION,
  INVALID_GITHUB_FILE_FORMAT,
  INVALID_GITHUB_RESPONSE,
  INVALID_GITHUB_TOKEN,
} from './errors';
import { getRepos } from './github-api-helpers';
import { GithubStorageProvider } from './github-storage-provider';

const extensionName = '@bangle.io/github-storage';

const extension = Extension.create({
  name: extensionName,
  application: {
    ReactComponent: GithubStorageComponent,
    slices: [],
    storageProvider: new GithubStorageProvider(),
    onStorageError: (error, store) => {
      const errorCode = error.code as ErrorCodesType;
      switch (errorCode) {
        case GITHUB_API_ERROR: {
          showNotification({
            severity: 'error',
            title: error.message,
            uid: `github-storage-error-${errorCode}`,
          })(store.state, store.dispatch);
          break;
        }
        case INVALID_GITHUB_FILE_FORMAT: {
          showNotification({
            severity: 'error',
            title: error.message,
            uid: `github-file-format`,
          })(store.state, store.dispatch);
          break;
        }
        case INVALID_GITHUB_TOKEN: {
          showNotification({
            severity: 'error',
            title: 'Github token is invalid',
            uid: 'Invalid github token',
          })(store.state, store.dispatch);
          break;
        }

        case INVALID_GITHUB_CONFIGURATION: {
          showNotification({
            severity: 'error',
            title: 'Invalid github workspace configuration',
            uid: INVALID_GITHUB_CONFIGURATION,
          })(store.state, store.dispatch);
          break;
        }

        case INVALID_GITHUB_RESPONSE: {
          showNotification({
            severity: 'error',
            title: 'Received invalid response from Github',
            uid: INVALID_GITHUB_RESPONSE,
          })(store.state, store.dispatch);
          break;
        }

        case IndexedDbStorageError.VALIDATION_ERROR: {
          showNotification({
            severity: 'error',
            title: 'Invalid data',
            uid: 'VALIDATION_ERROR',
          })(store.state, store.dispatch);
          break;
        }

        case IndexedDbStorageError.FILE_NOT_FOUND_ERROR: {
          showNotification({
            severity: 'error',
            title: 'File not found',
            uid: 'FILE_NOT_FOUND_ERROR',
          })(store.state, store.dispatch);
          break;
        }

        case IndexedDbStorageError.UPSTREAM_ERROR: {
          console.error(error);
          showNotification({
            severity: 'error',
            title: 'upstream error',
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
          uncaughtExceptionNotification(error)(store.state, store.dispatch);

          return false;
        }
      }

      return true;
    },
    operations: [
      {
        name: OPERATION_NEW_GITUB_WORKSPACE,
        title: 'New Github workspace',
      },
    ],
    operationHandler() {
      return {
        handle(operation, payload, store) {
          switch (operation.name) {
            case 'operation::@bangle.io/github-storage:new-workspace': {
              const token = localStorage.getItem('github_token')!;

              // createWorkspace('github-test-notes', 'github-storage', {
              //   githubToken: token,
              //   owner: 'kepta',
              //   branch: 'master',
              // })(store.state, store.dispatch, store).catch((error) => {
              //   showNotification({
              //     severity: 'error',
              //     uid: 'error-create-workspace-github',
              //     title: 'Unable to create workspace ',
              //     content: error.displayMessage || error.message,
              //   })(
              //     notificationSliceKey.getState(store.state),
              //     notificationSliceKey.getDispatch(store.dispatch),
              //   );
              // });

              return true;
            }

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

// let r = await fetch('https://api.github.com/graphql', {
//   method: 'POST',
//   headers: {
//     'Content-Type': 'application/json',
//     'Authorization': `bearer ${token}`,
//   },
//   body: JSON.stringify({
//     query: `
//     query {
//       repository(owner: "octocat", name: "Hello-World") {
//         issues(last: 20, states: CLOSED) {
//           edges {
//             node {
//               title
//               url
//               labels(first: 5) {
//                 edges {
//                   node {
//                     name
//                   }
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//     `,
//     variables: {},
//   }),
// });
