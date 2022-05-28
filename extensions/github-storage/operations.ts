import {
  BangleAppDispatch,
  BangleApplicationStore,
  BangleAppState,
  notification,
  workspace,
} from '@bangle.io/api';
import { pMap } from '@bangle.io/p-map';
import {
  LocalFileEntryManager,
  RemoteFileEntry,
} from '@bangle.io/remote-file-sync';
import { BaseError, isAbortError } from '@bangle.io/utils';

import { GITHUB_STORAGE_PROVIDER_NAME } from './common';
import { handleError } from './error-handling';
import { getRepoTree } from './github-api-helpers';
import { GithubWsMetadata } from './helpers';
import { houseKeeping, pushLocalChanges } from './sync2';

const LOG = true;
const log = LOG
  ? console.debug.bind(console, 'github-storage operations')
  : () => {};

export function isCurrentWorkspaceGithubStored(wsName: string) {
  return (state: BangleAppState) => {
    return (
      workspace.getStorageProviderName(wsName)(state) ===
      GITHUB_STORAGE_PROVIDER_NAME
    );
  };
}

export const readGithubTokenFromStore = () => {
  return workspace.workspaceSliceKey.queryOp((state) => {
    const wsName = workspace.getWsName()(state);

    if (wsName && isCurrentWorkspaceGithubStored(wsName)(state)) {
      const metadata = workspace.getWorkspaceMetadata(wsName)(state);

      return metadata?.githubToken as string | undefined;
    }

    return undefined;
  });
};

export const updateGithubToken =
  (wsName: string, token: string | undefined, showNotification = false) =>
  (state: BangleAppState, dispatch: BangleAppDispatch) => {
    if (isCurrentWorkspaceGithubStored(wsName)(state)) {
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
      if (!isCurrentWorkspaceGithubStored(wsName)(state)) {
        return undefined;
      }

      const workspaceStore = workspace.workspaceSliceKey.getStore(store);
      const { openedWsPaths } =
        workspace.workspaceSliceKey.getSliceStateAsserted(store.state);
      const storageOpts = workspace.getStorageProviderOpts()(
        workspaceStore.state,
        workspaceStore.dispatch,
      );
      const wsMetadata = storageOpts.readWorkspaceMetadata(
        wsName,
      ) as GithubWsMetadata;

      const wsPaths = openedWsPaths
        .toArray()
        .filter((r): r is string => typeof r === 'string');
      const getTree = getRepoTree();
      const tree = await getTree({
        wsName,
        config: { ...wsMetadata, repoName: wsName },
      });

      const { removedWsPaths, updatedWsPaths } = await houseKeeping({
        fileEntryManager,
        ghConfig: wsMetadata,
        retainedWsPaths: new Set(wsPaths),
        tree,
        wsName,
      });

      await pushLocalChanges({
        wsName,
        ghConfig: wsMetadata,
        tree,
        fileEntryManager,
        abortSignal,
      });

      // const { deletedWsPaths, updatedWsPaths } = await syncUntouchedEntries(
      //   abortSignal,
      //   fileEntryManager,
      //   wsName,
      //   wsMetadata,
      // );

      // if (
      //   needsEditorReset({
      //     openedWsPaths: workspace.workspaceSliceKey.getSliceStateAsserted(
      //       workspaceStore.state,
      //     ).openedWsPaths,
      //     updatedWsPaths,
      //     deletedWsPaths,
      //   })
      // ) {
      //   ui.showDialog(RELOAD_APPLICATION_DIALOG_NAME)(state, dispatch);

      //   return;
      // }

      // const total = (updatedWsPaths.length || 0) + (deletedWsPaths.length || 0);

      if (updatedWsPaths.length === 0 && removedWsPaths.length === 0) {
        notification.showNotification({
          severity: 'info',
          title: 'Everything upto date',
          uid: 'no-changes',
        })(store.state, store.dispatch);
      }
      if (updatedWsPaths.length > 0) {
        notification.showNotification({
          severity: 'info',
          title: `Synced ${updatedWsPaths.length} file${
            updatedWsPaths.length === 1 ? '' : 's'
          }`,
          uid: 'sync done ' + Math.random(),
        })(store.state, store.dispatch);
      }

      if (removedWsPaths.length > 0) {
        notification.showNotification({
          severity: 'info',
          title: `Cleaned ${removedWsPaths.length} file${
            removedWsPaths.length === 1 ? '' : 's'
          }`,
          uid: 'sync done ' + Math.random(),
        })(store.state, store.dispatch);
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
      if (!isCurrentWorkspaceGithubStored(wsName)(state)) {
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
            await fileEntryManager.updateFileEntry(
              remoteFileEntry.forkLocalFileEntry(),
            );
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
