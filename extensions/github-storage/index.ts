import React from 'react';

import { Extension, notification, workspace } from '@bangle.io/api';
import { CORE_OPERATIONS_OPEN_GITHUB_ISSUE } from '@bangle.io/constants';
import {
  ErrorCode as RemoteSyncErrorCode,
  ErrorCodeType as RemoteFileSyncErrorCodeType,
} from '@bangle.io/remote-file-sync';
import { isIndexedDbException } from '@bangle.io/storage';
import { GithubIcon } from '@bangle.io/ui-components';

import {
  OPERATION_NEW_GITHUB_WORKSPACE,
  OPERATION_PULL_GITHUB_CHANGES,
  OPERATION_PUSH_GITHUB_CHANGES,
  OPERATION_SYNC_GITHUB_CHANGES,
  OPERATION_UPDATE_GITHUB_TOKEN,
} from './common';
import { GithubSidebar } from './components/GithubSidebar';
import { Router } from './components/Router';
import {
  ErrorCodesType,
  GITHUB_API_ERROR,
  GITHUB_STORAGE_NOT_ALLOWED,
  INVALID_GITHUB_FILE_FORMAT,
  INVALID_GITHUB_RESPONSE,
  INVALID_GITHUB_TOKEN,
} from './errors';
import { localFileEntryManager } from './file-entry-manager';
import { GithubStorageProvider } from './github-storage-provider';
import { githubStorageSlice } from './github-storage-slice';
import { GithubWsMetadata, isGithubStorageProvider } from './helpers';
import { needsEditorReset, pullGithubChanges } from './pull-github-changes';

const extensionName = '@bangle.io/github-storage';

const extension = Extension.create({
  name: extensionName,
  application: {
    ReactComponent: Router,
    slices: [githubStorageSlice()],
    storageProvider: new GithubStorageProvider(),
    sidebars: [
      {
        title: 'Github sync',
        name: 'sidebar::@bangle.io/github-storage:sidebar',
        ReactComponent: GithubSidebar,
        activitybarIcon: React.createElement(GithubIcon, {}),
        hint: 'Sync your local workspace with Github',
      },
    ],
    onStorageError: (error, store) => {
      const errorCode = error.code as
        | ErrorCodesType
        | RemoteFileSyncErrorCodeType;

      if (isIndexedDbException(error)) {
        console.debug(error.code, error.name);
        notification.showNotification({
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
            notification.showNotification({
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
          notification.showNotification({
            severity: 'error',
            title: 'Github API error',
            content: error.message,
            uid: `github-storage-error-${errorCode}`,
          })(store.state, store.dispatch);
          break;
        }
        case INVALID_GITHUB_FILE_FORMAT: {
          notification.showNotification({
            severity: 'error',
            title: 'Invalid file format',
            content: error.message,
            uid: `github-file-format`,
          })(store.state, store.dispatch);
          break;
        }
        case INVALID_GITHUB_TOKEN: {
          notification.showNotification({
            severity: 'error',
            title: 'Github token is invalid',
            content: error.message,
            uid: 'Invalid github token',
          })(store.state, store.dispatch);
          break;
        }

        case INVALID_GITHUB_RESPONSE: {
          notification.showNotification({
            severity: 'error',
            title: 'Received invalid response from Github',
            content: error.message,
            uid: INVALID_GITHUB_RESPONSE,
          })(store.state, store.dispatch);
          break;
        }

        case GITHUB_STORAGE_NOT_ALLOWED: {
          notification.showNotification({
            severity: 'error',
            title: 'Not allowed',
            content: error.message,
            uid: GITHUB_STORAGE_NOT_ALLOWED + error.message,
          })(store.state, store.dispatch);
          break;
        }

        case RemoteSyncErrorCode.REMOTE_SYNC_NOT_ALLOWED_ERROR: {
          notification.showNotification({
            severity: 'error',
            title: 'Not allowed',
            content: error.message,
            uid:
              RemoteSyncErrorCode.REMOTE_SYNC_NOT_ALLOWED_ERROR + error.message,
          })(store.state, store.dispatch);
          break;
        }

        default: {
          // hack to catch switch slipping
          let val: never = errorCode;

          console.error(error);

          notification.showNotification({
            severity: 'error',
            title: 'Bangle.io encountered a problem.',
            uid: `uncaughtExceptionNotification-` + error.name,
            buttons: [
              {
                title: 'Report issue',
                hint: `Report an issue on Github`,
                operation: CORE_OPERATIONS_OPEN_GITHUB_ISSUE,
              },
            ],
            content: error.message,
          })(store.state, store.dispatch);

          return false;
        }
      }

      return true;
    },
    operations: [
      {
        name: OPERATION_NEW_GITHUB_WORKSPACE,
        title: 'Github: New READONLY workspace (Experimental)',
      },
      {
        name: OPERATION_UPDATE_GITHUB_TOKEN,
        title: 'Github: Update personal access token',
      },
      {
        name: OPERATION_PULL_GITHUB_CHANGES,
        title: 'Github: Pull changes',
        hidden: false,
      },
      {
        name: OPERATION_PUSH_GITHUB_CHANGES,
        title: 'Github: Push changes',
        hidden: true,
      },
      {
        name: OPERATION_SYNC_GITHUB_CHANGES,
        title: 'Github: Sync changes',
      },
    ],
    operationHandler() {
      let abortController = new AbortController();

      return {
        handle(operation, payload, store) {
          switch (operation.name) {
            case OPERATION_PULL_GITHUB_CHANGES: {
              abortController.abort();
              abortController = new AbortController();
              const wsName = workspace.getWsName()(store.state);

              if (!wsName) {
                return false;
              }

              const storageOpts = workspace.getStorageProviderOpts()(
                store.state,
                store.dispatch,
              );

              if (!isGithubStorageProvider()(store.state)) {
                return false;
              }

              const wsMetadata =
                storageOpts.readWorkspaceMetadata() as GithubWsMetadata;

              pullGithubChanges(
                wsName,
                localFileEntryManager,
                wsMetadata,
                abortController.signal,
              ).then(
                (result) => {
                  const { openedWsPaths } =
                    workspace.workspaceSliceKey.getSliceStateAsserted(
                      store.state,
                    );

                  console.log(
                    'needsEditorReset',
                    needsEditorReset({
                      openedWsPaths,
                      updatedWsPaths: result?.updatedWsPaths || [],
                      deletedWsPaths: result?.deletedWsPaths || [],
                    }),
                  );

                  const total =
                    (result?.updatedWsPaths.length || 0) +
                    (result?.deletedWsPaths.length || 0);

                  if (total === 0) {
                    notification.showNotification({
                      severity: 'info',
                      title: 'Everything upto date',
                      uid: 'no-changes',
                    })(store.state, store.dispatch);
                  } else {
                    notification.showNotification({
                      severity: 'info',
                      title: `Synced ${total} file${total === 1 ? '' : 's'}`,
                      uid: 'sync done ' + Math.random(),
                    })(store.state, store.dispatch);
                  }
                },
                (error) => {
                  notification.showNotification({
                    severity: 'error',
                    title: 'Error syncing',
                    content: error.message,
                    uid: 'sync error ' + Math.random(),
                  })(store.state, store.dispatch);
                },
              );

              return true;
            }
            case OPERATION_SYNC_GITHUB_CHANGES: {
              return false;
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
