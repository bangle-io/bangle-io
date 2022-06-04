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
import {
  acquireLockIfAvailable,
  BaseError,
  isAbortError,
} from '@bangle.io/utils';

import { ghSliceKey, GITHUB_STORAGE_PROVIDER_NAME, LOCK_NAME } from './common';
import { handleError } from './error-handling';
import { getRepoTree } from './github-api-helpers';
import { GithubWsMetadata } from './helpers';
import { pushLocalChanges } from './sync-with-github';

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
  verboseNotifications = true,
) {
  return async (
    state: BangleAppState,
    dispatch: BangleAppDispatch,
    store: BangleApplicationStore,
  ) => {
    async function sync() {
      if (!isCurrentWorkspaceGithubStored(wsName)(state)) {
        return undefined;
      }

      if (isSyncPending()(state)) {
        if (verboseNotifications === true) {
          notification.showNotification({
            severity: 'warning',
            title: 'Sync already in progress',
            uid: 'gh-sync-in-progress' + Date.now(),
            transient: true,
          })(store.state, store.dispatch);
        }

        return undefined;
      }

      const workspaceStore = workspace.workspaceSliceKey.getStore(store);
      const {
        openedWsPaths,
        recentlyUsedWsPaths,
        wsName: currentWsName,
      } = workspace.workspaceSliceKey.getSliceStateAsserted(store.state);

      // ensure that the current workspace is the one we are syncing
      if (currentWsName !== wsName) {
        return undefined;
      }

      const storageOpts = workspace.getStorageProviderOpts()(
        workspaceStore.state,
        workspaceStore.dispatch,
      );
      const wsMetadata = storageOpts.readWorkspaceMetadata(
        wsName,
      ) as GithubWsMetadata;

      const toRetain: string[] = [
        ...openedWsPaths.toArray(),
        ...(recentlyUsedWsPaths || []),
      ].filter((r): r is string => typeof r === 'string');

      const result = await startSync(
        wsName,
        new Set(toRetain),
        wsMetadata,
        fileEntryManager,
      )(store.state, store.dispatch, store);

      if (result.status === 'merge-conflict') {
        notification.showNotification({
          severity: 'error',
          title: 'Error syncing',
          content: `Encountered ${result.count} merge conflict`,
          uid: 'sync error ' + Math.random(),
        })(store.state, store.dispatch);

        return result.status;
      }

      if (result.status === 'pending') {
        return result.status;
      }

      // TODO reload application until we figure out better way to reset editor
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

      const { count: changeCount } = result;

      if (typeof changeCount === 'number') {
        if (changeCount === 0) {
          if (verboseNotifications === true) {
            notification.showNotification({
              severity: 'info',
              title: 'Everything upto date',
              uid: 'no-changes',
              transient: true,
            })(store.state, store.dispatch);
          }
        }
        if (changeCount > 0) {
          notification.showNotification({
            severity: 'info',
            title: `Synced ${changeCount} file${changeCount === 1 ? '' : 's'}`,
            uid: 'sync done ' + Math.random(),
            transient: true,
          })(store.state, store.dispatch);
        }
      }

      return true;
    }

    const releaseLock = await acquireLockIfAvailable(LOCK_NAME + ':' + wsName);

    if (!releaseLock) {
      if (verboseNotifications === true) {
        console.debug('Sync already in progress for this workspace');
        notification.showNotification({
          severity: 'warning',
          title: 'Sync already in progress for this workspace',
          uid: 'gh-sync-in-progress' + Date.now(),
          transient: true,
        })(store.state, store.dispatch);
      }

      return undefined;
    }

    try {
      return await sync();
    } catch (error) {
      if (isAbortError(error)) {
        return undefined;
      }

      if (error instanceof BaseError) {
        handleError(error as any, store);

        notification.showNotification({
          severity: 'error',
          title: 'Error syncing',
          content: error.message,
          uid: 'sync error ' + Math.random(),
        })(store.state, store.dispatch);

        return false;
      } else {
        throw error;
      }
    } finally {
      await releaseLock();
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

      if (isSyncPending()(state)) {
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
            await fileEntryManager.overwriteFileEntry(
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

      const storageOpts = workspace.getStorageProviderOpts()(
        store.state,
        store.dispatch,
      );

      const wsMetadata = storageOpts.readWorkspaceMetadata(
        wsName,
      ) as GithubWsMetadata;

      await startSync(
        wsName,
        new Set(),
        wsMetadata,
        fileEntryManager,
      )(store.state, store.dispatch, store);

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

function isSyncPending() {
  return ghSliceKey.queryOp((state) => {
    const res = ghSliceKey.getSliceState(state);

    if (!res) {
      return true;
    }

    return res.syncState;
  });
}

function startSync(
  wsName: string,
  retainedWsPaths: Set<string>,
  wsMetadata: GithubWsMetadata,
  fileEntryManager: LocalFileEntryManager,
) {
  return ghSliceKey.asyncOp(async (_, dispatch, store) => {
    if (isSyncPending()(store.state)) {
      return { status: 'pending' as const };
    }

    ghSliceKey.getDispatch(store.dispatch)({
      name: 'action::@bangle.io/github-storage:UPDATE_SYNC_STATE',
      value: {
        syncState: true,
      },
    });

    try {
      const getTree = getRepoTree();

      const tree = await getTree({
        wsName,
        config: { ...wsMetadata, repoName: wsName },
      });

      return await pushLocalChanges({
        wsName,
        ghConfig: wsMetadata,
        retainedWsPaths,
        tree,
        fileEntryManager,
        // TODO currently this is not abortable
        abortSignal: new AbortController().signal,
      });
    } finally {
      store.dispatch({
        name: 'action::@bangle.io/github-storage:UPDATE_SYNC_STATE',
        value: {
          syncState: false,
        },
      });
    }
  });
}
