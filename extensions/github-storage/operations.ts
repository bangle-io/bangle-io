import type { BangleApplicationStore } from '@bangle.io/api';
import { notification, workspace } from '@bangle.io/api';
import { Severity } from '@bangle.io/constants';
import { pMap } from '@bangle.io/p-map';
import { RemoteFileEntry } from '@bangle.io/remote-file-sync';
import { BaseError } from '@bangle.io/utils';

import { getGithubSyncLockWrapper, ghSliceKey } from './common';
import { getGhToken, updateGhToken } from './database';
import { INVALID_GITHUB_TOKEN } from './errors';
import { localFileEntryManager } from './file-entry-manager';
import type { GithubConfig } from './github-api-helpers';
import { ghSyncFinal } from './github-sync';
import { readGhWorkspaceMetadata } from './helpers';

export function syncRunner(
  wsName: string,
  abort: AbortSignal,
  notifyVerbose = false,
) {
  return ghSliceKey.asyncOp(async (_, __, store) => {
    const result = await runGuard(wsName, abort, store, notifyVerbose);

    if (result === false) {
      console.log('gh-sync returned false');
    } else {
      const { count: changeCount } = result;

      if (result.status === 'merge-conflict') {
        notify(
          store,
          'Github sync failed',
          Severity.ERROR,
          `Encountered ${result.count} merge conflict`,
        );

        return;
      }

      if (typeof changeCount === 'number') {
        if (changeCount === 0) {
          notifyVerbose &&
            notify(store, 'Github sync completed', Severity.INFO);
        }
        if (changeCount > 0) {
          notify(
            store,
            'Github sync completed',
            Severity.INFO,
            `Synced ${changeCount} file${changeCount === 1 ? '' : 's'}`,
          );
        }
      }
    }
  });
}

export function discardLocalChanges(wsName: string) {
  return ghSliceKey.asyncOp(async (_, __, store) => {
    const { isSyncing } = ghSliceKey.getSliceStateAsserted(store.state);

    if (isSyncing) {
      notify(
        store,
        'Cannot discard local changes',
        Severity.INFO,
        'A sync is already in progress, please wait for it to finish.',
      );

      return false;
    }

    const { lockAcquired, result } = await getGithubSyncLockWrapper(
      wsName,
      async () => {
        const allEntries = await localFileEntryManager.getAllEntries(
          wsName + ':',
        );

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
              console.debug('resetting file entry', entry.uid);
              await localFileEntryManager.overwriteFileEntry(
                remoteFileEntry.forkLocalFileEntry(),
              );
            } else {
              console.debug('removing file entry', entry.uid);
              await localFileEntryManager.removeFileEntry(entry.uid);
            }
          },
          {
            concurrency: 10,
            abortSignal: new AbortController().signal,
          },
        );
      },
    );

    if (!lockAcquired) {
      notify(
        store,
        'Cannot discard local changes',
        Severity.INFO,
        'A sync is already in progress, please wait for it to finish.',
      );

      return false;
    }

    return true;
  });
}

export const updateGithubToken = (
  wsName: string,
  token: string | undefined,
  showNotification = false,
) => {
  return ghSliceKey.asyncOp(async (_, __, store) => {
    if (ghSliceKey.getSliceStateAsserted(store.state).githubWsName === wsName) {
      await updateGhToken(token);

      if (showNotification) {
        notify(store, 'Github token successfully updated', Severity.SUCCESS);
      }

      return true;
    }

    if (showNotification) {
      notify(
        store,
        'Github token not updated',
        Severity.ERROR,
        'Please open a Github workspace before updating the token.',
      );
    }

    return false;
  });
};

function notify(
  store: BangleApplicationStore,
  title: string,
  severity: Severity,
  content?: string,
) {
  return notification.notificationSliceKey.callOp(
    store.state,
    store.dispatch,
    notification.showNotification({
      severity,
      title,
      uid: 'sync notification-' + Math.random(),
      transient: severity !== Severity.ERROR,
      content,
    }),
  );
}

async function runGuard(
  wsName: string,
  abort: AbortSignal,
  store: ReturnType<typeof ghSliceKey.getStore>,
  notifyVerbose: boolean,
) {
  const { githubWsName } = ghSliceKey.getSliceStateAsserted(store.state);

  if (githubWsName !== wsName) {
    notify(store, 'Not a Github workspace', Severity.WARNING);

    return false;
  }

  const githubToken = await getGhToken();

  if (!githubToken) {
    throw new BaseError({
      message: 'Github token is required',
      code: INVALID_GITHUB_TOKEN,
    });
  }

  const ghMetadata = await readGhWorkspaceMetadata(wsName);

  if (!ghMetadata) {
    return false;
  }

  const ghConfig = { ...ghMetadata, repoName: wsName, githubToken };

  if (ghSliceKey.getSliceStateAsserted(store.state).isSyncing) {
    notifyVerbose &&
      notify(store, 'Github sync already in progress', Severity.INFO);

    return false;
  }

  try {
    const { lockAcquired, result } = await getGithubSyncLockWrapper(
      wsName,
      async () => {
        store.dispatch({
          name: 'action::@bangle.io/github-storage:UPDATE_SYNC_STATE',
          value: {
            isSyncing: true,
          },
        });

        const result = await runSync(wsName, abort, store, ghConfig);

        return result;
      },
    );

    if (!lockAcquired) {
      notifyVerbose &&
        notify(store, 'Github sync already in progress', Severity.INFO);

      return false;
    }

    return result;
  } catch (error) {
    console.error(error);
    notify(
      store,
      'Github sync failed',
      Severity.ERROR,
      error instanceof Error ? error.message : 'Unknown error',
    );

    return false;
  } finally {
    store.dispatch({
      name: 'action::@bangle.io/github-storage:UPDATE_SYNC_STATE',
      value: {
        isSyncing: false,
      },
    });
  }
}

async function runSync(
  wsName: string,
  abort: AbortSignal,
  store: ReturnType<typeof ghSliceKey.getStore>,
  config: GithubConfig,
) {
  const {
    openedWsPaths,
    wsName: currentWsName,
    recentlyUsedWsPaths,
  } = workspace.workspaceSliceKey.getSliceStateAsserted(store.state);

  if (currentWsName !== wsName) {
    return false;
  }

  const retainedWsPaths = new Set(
    [...openedWsPaths.toArray(), ...(recentlyUsedWsPaths || [])].filter(
      (r): r is string => typeof r === 'string',
    ),
  );

  return ghSyncFinal({
    wsName,
    config,
    retainedWsPaths,
    abortSignal: abort,
  });
}
