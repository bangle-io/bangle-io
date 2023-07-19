import React from 'react';

import { Extension, getExtensionStore, nsmApi2 } from '@bangle.io/api';
import { GithubIcon } from '@bangle.io/ui-components';

import {
  CONFLICT_DIALOG,
  DISCARD_LOCAL_CHANGES_DIALOG,
  NEW_GITHUB_WORKSPACE_REPO_PICKER_DIALOG,
  NEW_GITHUB_WORKSPACE_TOKEN_DIALOG,
  OPERATION_DISCARD_LOCAL_CHANGES,
  OPERATION_OPTIMIZE_GITHUB_STORAGE,
  OPERATION_SHOW_CONFLICT_DIALOG,
  OPERATION_SYNC_GITHUB_CHANGES,
  OPERATION_UPDATE_GITHUB_TOKEN,
  UPDATE_GITHUB_TOKEN_DIALOG,
} from './common';
import { ConflictDialog } from './components/ConfllictDialog';
import { DiscardLocalChangesDialog } from './components/DiscardLocalChangesDialog';
import { GithubSidebar } from './components/GithubSidebar';
import { NewGithubWorkspaceTokenDialog } from './components/NewGithubWorkspaceDialog';
import { NewGithubWorkspaceRepoPickerDialog } from './components/NewGithubWorkspaceRepoPickerDialog';
import { UpdateTokenDialog } from './components/UpdateTokenDialog';
import { handleError } from './error-handling';
import { GithubStorageProvider } from './github-storage-provider';
import { githubEffects, nsmGhSlice, operations } from './state';

const extensionName = '@bangle.io/github-storage';

const extension = Extension.create({
  name: extensionName,
  application: {
    nsmSlices: [nsmGhSlice],
    nsmEffects: githubEffects,
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
      {
        name: CONFLICT_DIALOG,
        ReactComponent: ConflictDialog,
      },
    ],
    sidebars: [
      {
        title: 'Github sync',
        name: 'sidebar::@bangle.io/github-storage:sidebar',
        ReactComponent: GithubSidebar,
        activitybarIcon: React.createElement(GithubIcon, {}),
        hint: 'Sync your local workspace with Github',
        activitybarIconShow(wsName) {
          const store = getExtensionStore(nsmGhSlice).state;

          return nsmGhSlice.get(store).githubWsName === wsName;
        },
      },
    ],
    onStorageError: (error) => {
      return handleError(error);
    },
    operations: [
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
      {
        name: OPERATION_SHOW_CONFLICT_DIALOG,
        title: 'Github: Show conflicted files',
      },
      {
        name: OPERATION_OPTIMIZE_GITHUB_STORAGE,
        title: 'Github: Optimize storage',
      },
    ],
    operationHandler() {
      return {
        handle(operation, payload) {
          switch (operation.name) {
            case OPERATION_SYNC_GITHUB_CHANGES: {
              const { wsName } = nsmApi2.workspace.workspaceState();

              if (!wsName) {
                return false;
              }

              getExtensionStore(nsmGhSlice).dispatch(
                operations.syncRunner(new AbortController().signal, true),
              );

              return true;
            }

            case OPERATION_DISCARD_LOCAL_CHANGES: {
              nsmApi2.ui.showDialog({
                dialogName: DISCARD_LOCAL_CHANGES_DIALOG,
              });

              return true;
            }

            case OPERATION_UPDATE_GITHUB_TOKEN: {
              nsmApi2.ui.showDialog({ dialogName: UPDATE_GITHUB_TOKEN_DIALOG });

              return true;
            }

            case OPERATION_SHOW_CONFLICT_DIALOG: {
              nsmApi2.ui.showDialog({ dialogName: CONFLICT_DIALOG });

              return true;
            }

            case OPERATION_OPTIMIZE_GITHUB_STORAGE: {
              getExtensionStore(nsmGhSlice).dispatch(
                operations.optimizeDatabaseOperation(
                  true,
                  new AbortController().signal,
                ),
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
