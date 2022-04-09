import {
  BangleAppDispatch,
  BangleApplicationStore,
  BangleAppState,
  notification,
  ui,
  workspace,
  wsPathHelpers,
} from '@bangle.io/api';
import { RELOAD_APPLICATION_DIALOG_NAME } from '@bangle.io/constants';
import { pMap } from '@bangle.io/p-map';
import {
  LocalFileEntryManager,
  RemoteFileEntry,
} from '@bangle.io/remote-file-sync';
import { BaseError, isAbortError } from '@bangle.io/utils';

import { GITHUB_STORAGE_PROVIDER_NAME } from './common';
import { handleError } from './error-handling';
import { GithubRepoTree } from './github-repo-tree';
import { GithubWsMetadata } from './helpers';
import { syncUntouchedEntries } from './sync';

const LOG = true;
const log = LOG
  ? console.debug.bind(console, 'github-storage operations')
  : () => {};

export function isCurrentWorkspaceGithubStored() {
  return (state: BangleAppState) => {
    const wsName = workspace.getWsName()(state);

    if (!wsName) {
      return false;
    }

    return (
      workspace.getStorageProviderName(wsName)(state) ===
      GITHUB_STORAGE_PROVIDER_NAME
    );
  };
}

export const readGithubTokenFromStore = () => {
  return workspace.workspaceSliceKey.queryOp((state) => {
    const wsName = workspace.getWsName()(state);

    if (wsName && isCurrentWorkspaceGithubStored()(state)) {
      const metadata = workspace.getWorkspaceMetadata(wsName)(state);

      return metadata?.githubToken as string | undefined;
    }

    return undefined;
  });
};

export const updateGithubToken =
  (token: string | undefined, showNotification = false) =>
  (state: BangleAppState, dispatch: BangleAppDispatch) => {
    const wsName = workspace.getWsName()(state);

    if (wsName && isCurrentWorkspaceGithubStored()(state)) {
      workspace.updateWorkspaceMetadata(wsName, (existing) => {
        if (existing.githubToken !== token) {
          return {
            ...existing,
            githubToken: token,
          };
        }

        return existing;
      })(state, dispatch);

      if (showNotification) {
        notification.showNotification({
          uid: 'success-update-github-token',
          title: 'Github successfully token updated',
          severity: 'success',
        })(state, dispatch);
      }

      return true;
    }

    if (showNotification) {
      notification.showNotification({
        uid: 'failure-update-github-token-no-wsname',
        title: 'Github token not updated',
        content: 'Please open a Github workspace before updating the token.',
        severity: 'error',
      })(state, dispatch);
    }

    return false;
  };

export function syncWithGithub(
  wsName: string,
  abortSignal: AbortSignal,
  fileEntryManager: LocalFileEntryManager,
  showNotification?: boolean,
) {
  return async (
    state: BangleAppState,
    dispatch: BangleAppDispatch,
    store: BangleApplicationStore,
  ) => {
    try {
      if (!isCurrentWorkspaceGithubStored()(state)) {
        return undefined;
      }

      const workspaceStore = workspace.workspaceSliceKey.getStore(store);
      const storageOpts = workspace.getStorageProviderOpts()(
        workspaceStore.state,
        workspaceStore.dispatch,
      );
      const wsMetadata =
        storageOpts.readWorkspaceMetadata() as GithubWsMetadata;

      await GithubRepoTree.refreshCachedData(
        wsName,
        wsMetadata,
        new AbortController().signal,
      );
      const { deletedWsPaths, updatedWsPaths } = await syncUntouchedEntries(
        abortSignal,
        fileEntryManager,
        wsName,
        wsMetadata,
      );

      if (
        needsEditorReset({
          openedWsPaths: workspace.workspaceSliceKey.getSliceStateAsserted(
            workspaceStore.state,
          ).openedWsPaths,
          updatedWsPaths,
          deletedWsPaths,
        })
      ) {
        ui.showDialog(RELOAD_APPLICATION_DIALOG_NAME)(state, dispatch);

        return;
      }

      const total = (updatedWsPaths.length || 0) + (deletedWsPaths.length || 0);

      if (showNotification) {
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
      }

      return undefined;
    } catch (error) {
      if (isAbortError(error)) {
        console.log('aborted');

        return undefined;
      }

      if (error instanceof BaseError) {
        handleError(error as any, store);

        if (showNotification) {
          notification.showNotification({
            severity: 'error',
            title: 'Error syncing',
            content: error.message,
            uid: 'sync error ' + Math.random(),
          })(store.state, store.dispatch);
        }

        return undefined;
      } else {
        throw error;
      }
    }
  };
}

function needsEditorReset({
  openedWsPaths,
  updatedWsPaths,
  deletedWsPaths,
}: {
  openedWsPaths: wsPathHelpers.OpenedWsPaths;
  updatedWsPaths: string[];
  deletedWsPaths: string[];
}) {
  return (
    updatedWsPaths.some((path) => openedWsPaths.has(path)) ||
    deletedWsPaths.some((path) => openedWsPaths.has(path))
  );
}

export function discardLocalChanges(
  wsName: string,
  fileEntryManager: LocalFileEntryManager,
) {
  return async (
    state: BangleAppState,
    dispatch: BangleAppDispatch,
    store: BangleApplicationStore,
  ) => {
    try {
      if (!isCurrentWorkspaceGithubStored()(state)) {
        return;
      }

      const allEntries = await fileEntryManager.getAllEntries(wsName + ':');

      await pMap(
        allEntries.filter((r) => {
          return r.isModified || r.isNew || r.isDeleted;
        }),
        async (entry) => {
          if (entry.source?.file) {
            const remoteFileEntry = await RemoteFileEntry.newFile({
              uid: entry.uid,
              file: entry.source.file,
              deleted: undefined,
            });
            log('resetting file entry', entry.uid);
            await fileEntryManager.updateFileEntry(remoteFileEntry.fork());
          } else {
            log('removing file entry', entry.uid);
            await fileEntryManager.removeFileEntry(entry.uid);
          }
        },
        {
          concurrency: 10,
          abortSignal: new AbortController().signal,
        },
      );

      return;
    } catch (error) {
      if (error instanceof Error) {
        notification.showNotification({
          severity: 'error',
          title: 'Error discarding local changes',
          content: error.message,
          uid: 'discard error ' + Math.random(),
        })(store.state, store.dispatch);
      }

      if (!(error instanceof BaseError)) {
        throw error;
      }
    }
  };
}
