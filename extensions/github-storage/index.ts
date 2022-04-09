import React from 'react';

import { Extension, ui, workspace } from '@bangle.io/api';
import { GithubIcon } from '@bangle.io/ui-components';

import {
  DISCARD_LOCAL_CHANGES_DIALOG,
  OPERATION_DISCARD_LOCAL_CHANGES,
  OPERATION_NEW_GITHUB_WORKSPACE,
  OPERATION_PULL_GITHUB_CHANGES,
  OPERATION_PUSH_GITHUB_CHANGES,
  OPERATION_SYNC_GITHUB_CHANGES,
  OPERATION_UPDATE_GITHUB_TOKEN,
} from './common';
import { DiscardLocalChangesDialog } from './components/DiscardLocalChangesDialog';
import { GithubSidebar } from './components/GithubSidebar';
import { Router } from './components/Router';
import { handleError } from './error-handling';
import { localFileEntryManager } from './file-entry-manager';
import { GithubStorageProvider } from './github-storage-provider';
import { githubStorageSlice } from './github-storage-slice';
import { isCurrentWorkspaceGithubStored, syncWithGithub } from './operations';

const extensionName = '@bangle.io/github-storage';

const extension = Extension.create({
  name: extensionName,
  application: {
    ReactComponent: Router,
    slices: [githubStorageSlice()],
    storageProvider: new GithubStorageProvider(),
    dialogs: [
      {
        name: DISCARD_LOCAL_CHANGES_DIALOG,
        ReactComponent: DiscardLocalChangesDialog,
      },
    ],
    sidebars: [
      {
        title: 'Github sync',
        name: 'sidebar::@bangle.io/github-storage:sidebar',
        ReactComponent: GithubSidebar,
        activitybarIcon: React.createElement(GithubIcon, {}),
        hint: 'Sync your local workspace with Github',
        activitybarIconShow: (appState) => {
          return isCurrentWorkspaceGithubStored()(appState);
        },
      },
    ],
    onStorageError: (error, store) => {
      return handleError(error, store);
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
      {
        name: OPERATION_DISCARD_LOCAL_CHANGES,
        title: 'Github: Reset local changes',
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

              if (!isCurrentWorkspaceGithubStored()(store.state)) {
                return false;
              }

              syncWithGithub(
                wsName,
                abortController.signal,
                localFileEntryManager,
              )(store.state, store.dispatch, store);

              return true;
            }
            case OPERATION_SYNC_GITHUB_CHANGES: {
              return false;
            }
            case OPERATION_DISCARD_LOCAL_CHANGES: {
              ui.showDialog(DISCARD_LOCAL_CHANGES_DIALOG)(
                store.state,
                store.dispatch,
              );

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
