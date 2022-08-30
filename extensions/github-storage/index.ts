import React from 'react';

import { Extension, ui, workspace } from '@bangle.io/api';
import { GithubIcon } from '@bangle.io/ui-components';

import {
  DISCARD_LOCAL_CHANGES_DIALOG,
  ghSliceKey,
  NEW_GITHUB_WORKSPACE_REPO_PICKER_DIALOG,
  NEW_GITHUB_WORKSPACE_TOKEN_DIALOG,
  OPERATION_DISCARD_LOCAL_CHANGES,
  OPERATION_NEW_GITHUB_WORKSPACE,
  OPERATION_SYNC_GITHUB_CHANGES,
  OPERATION_UPDATE_GITHUB_TOKEN,
  UPDATE_GITHUB_TOKEN_DIALOG,
} from './common';
import { DiscardLocalChangesDialog } from './components/DiscardLocalChangesDialog';
import { GithubSidebar } from './components/GithubSidebar';
import { NewGithubWorkspaceTokenDialog } from './components/NewGithubWorkspaceDialog';
import { NewGithubWorkspaceRepoPickerDialog } from './components/NewGithubWorkspaceRepoPickerDialog';
import { UpdateTokenDialog } from './components/UpdateTokenDialog';
import { handleError } from './error-handling';
import { localFileEntryManager } from './file-entry-manager';
import { GithubStorageProvider } from './github-storage-provider';
import { githubStorageSlice } from './github-storage-slice';
import { syncWithGithub } from './operations';

const extensionName = '@bangle.io/github-storage';

const extension = Extension.create({
  name: extensionName,
  application: {
    slices: [githubStorageSlice()],
    storageProvider: new GithubStorageProvider(),
    dialogs: [
      {
        name: DISCARD_LOCAL_CHANGES_DIALOG,
        ReactComponent: DiscardLocalChangesDialog,
      },
      {
        name: NEW_GITHUB_WORKSPACE_TOKEN_DIALOG,
        ReactComponent: NewGithubWorkspaceTokenDialog,
      },
      {
        name: NEW_GITHUB_WORKSPACE_REPO_PICKER_DIALOG,
        ReactComponent: NewGithubWorkspaceRepoPickerDialog,
      },
      {
        name: UPDATE_GITHUB_TOKEN_DIALOG,
        ReactComponent: UpdateTokenDialog,
      },
    ],
    sidebars: [
      {
        title: 'Github sync',
        name: 'sidebar::@bangle.io/github-storage:sidebar',
        ReactComponent: GithubSidebar,
        activitybarIcon: React.createElement(GithubIcon, {}),
        hint: 'Sync your local workspace with Github',
        activitybarIconShow(wsName, state) {
          return Boolean(ghSliceKey.getSliceState(state)?.githubWsName);
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
        name: OPERATION_SYNC_GITHUB_CHANGES,
        title: 'Github: Sync changes',
      },
      {
        name: OPERATION_DISCARD_LOCAL_CHANGES,
        title: 'Github: Discard local changes',
      },
    ],
    operationHandler() {
      let abortController = new AbortController();

      return {
        handle(operation, payload, store) {
          switch (operation.name) {
            case OPERATION_SYNC_GITHUB_CHANGES: {
              abortController.abort();
              abortController = new AbortController();
              const wsName = workspace.getWsName()(store.state);

              if (!wsName) {
                return false;
              }

              syncWithGithub(
                wsName,
                abortController.signal,
                localFileEntryManager(),
              )(store.state, store.dispatch, store);

              return true;
            }

            case OPERATION_NEW_GITHUB_WORKSPACE: {
              ui.showDialog(NEW_GITHUB_WORKSPACE_TOKEN_DIALOG)(
                store.state,
                store.dispatch,
              );

              return true;
            }
            case OPERATION_DISCARD_LOCAL_CHANGES: {
              ui.showDialog(DISCARD_LOCAL_CHANGES_DIALOG)(
                store.state,
                store.dispatch,
              );

              return true;
            }

            case OPERATION_UPDATE_GITHUB_TOKEN: {
              ui.showDialog(UPDATE_GITHUB_TOKEN_DIALOG)(
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
