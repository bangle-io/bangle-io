import type { BangleApplicationStore } from '@bangle.io/api';
import { notification, workspace } from '@bangle.io/api';
import { Severity } from '@bangle.io/constants';
import { pMap } from '@bangle.io/p-map';
import { BaseError } from '@bangle.io/utils';

import { getGithubSyncLockWrapper, ghSliceKey } from './common';
import { getGhToken, updateGhToken } from './database';
import { INVALID_GITHUB_TOKEN } from './errors';
import { localFileEntryManager } from './file-entry-manager';
import type { GithubConfig } from './github-api-helpers';
import {
  discardLocalEntryChanges,
  duplicateAndResetToRemote,
  getConflicts,
  githubSync,
} from './github-sync';
import { readGhWorkspaceMetadata } from './helpers';

export function syncRunner(
  wsName: string,
  abort: AbortSignal,
  notifyVerbose = false,
) {
  return ghSliceKey.asyncOp(async (_, __, store) => {
    const result = await syncRunGuard(wsName, abort, store, notifyVerbose);

    if (result === false) {
      console.log('gh-sync returned false');
    } else {
      workspace.workspaceSliceKey.callOp(
        store.state,
        store.dispatch,
        workspace.refreshWsPaths(),
      );

      const { count: changeCount } = result;

      if (result.status === 'merge-conflict') {
        setConflictedWsPaths(result.conflict)(store.state, store.dispatch);

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

export function setConflictedWsPaths(conflictedWsPaths: string[]) {
  return ghSliceKey.op((state, dispatch) => {
    dispatch({
      name: 'action::@bangle.io/github-storage:SET_CONFLICTED_WS_PATHS',
      value: {
        conflictedWsPaths,
      },
    });
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

        const result = await pMap(
          allEntries.filter((r) => {
            return r.isModified || r.isNew || r.isDeleted;
          }),
          async (entry) => {
            return discardLocalEntryChanges(entry.uid);
          },
          {
            concurrency: 10,
            abortSignal: new AbortController().signal,
          },
        );

        return result.every((r) => r);
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

    if (!result) {
      notify(
        store,
        'Failed to discard local changes',
        Severity.INFO,
        'Failed to discard local changes. Please try again.',
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

export function manuallyResolveConflict(wsName: string) {
  return ghSliceKey.asyncOp(async (_, __, store) => {
    const ghMetadata = await readGhWorkspaceMetadata(wsName);
    const githubToken = await getGhToken();

    if (!githubToken || !ghMetadata) {
      return false;
    }

    const config = { ...ghMetadata, repoName: wsName, githubToken };

    const { conflictedWsPaths } = ghSliceKey.getSliceStateAsserted(store.state);

    try {
      const { lockAcquired, result } = await getGithubSyncLockWrapper(
        wsName,
        async () => {
          let result: Array<
            Awaited<ReturnType<typeof duplicateAndResetToRemote>>
          > = [];

          for (const cWsPath of conflictedWsPaths) {
            result.push(
              await duplicateAndResetToRemote({
                config,
                wsPath: cWsPath,
                abortSignal: new AbortController().signal,
              }),
            );
          }

          return result;
        },
      );

      if (!lockAcquired || result.some((r) => r == null)) {
        if (!lockAcquired) {
          console.warn('cannot manually resolve conflict, lock not acquired');
        }

        notify(
          store,
          'Unable to resolve conflict',
          Severity.ERROR,
          'Please close any other Bangle tab and try again.',
        );

        return false;
      } else if (result) {
        store.dispatch({
          name: 'action::@bangle.io/github-storage:SET_CONFLICTED_WS_PATHS',
          value: {
            conflictedWsPaths: [],
          },
        });

        workspace.workspaceSliceKey.callOp(
          store.state,
          store.dispatch,
          workspace.refreshWsPaths(),
        );

        notify(
          store,
          'Manual Conflict Resolution',
          Severity.SUCCESS,
          'Successfully created copies of the the conflicted files. Please resolve the conflicts manually and then sync again.',
        );

        const firstConflictedWsPath = result.find((r) => Boolean(r));

        if (firstConflictedWsPath) {
          // open the first conflicted file for easier manual conflict resolution
          workspace.workspaceSliceKey.callOp(
            store.state,
            store.dispatch,
            workspace.updateOpenedWsPaths((openedWsPaths) =>
              openedWsPaths
                .updatePrimaryWsPath(firstConflictedWsPath.remoteContentWsPath)
                .updateSecondaryWsPath(
                  firstConflictedWsPath.localContentWsPath,
                ),
            ),
          );
        }

        return true;
      }

      return false;
    } catch (e) {
      console.error(e);
      notify(
        store,
        'Unable to resolve conflict',
        Severity.ERROR,
        'Something went wrong, please reload and try again.',
      );

      return false;
    }
  });
}

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

async function syncRunGuard(
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

  return githubSync({
    wsName,
    config,
    retainedWsPaths,
    abortSignal: abort,
  });
}

export function checkForConflicts(wsName: string) {
  return ghSliceKey.asyncOp(async (_, __, store) => {
    const ghMetadata = await readGhWorkspaceMetadata(wsName);
    const githubToken = await getGhToken();

    if (!githubToken || !ghMetadata) {
      return;
    }

    const config = { ...ghMetadata, repoName: wsName, githubToken };

    const conflicts = await getConflicts({ wsName, config });

    const { wsName: currentWsName } =
      workspace.workspaceSliceKey.getSliceStateAsserted(store.state);

    if (currentWsName === wsName) {
      const { conflictedWsPaths } = ghSliceKey.getSliceStateAsserted(
        store.state,
      );

      if (
        conflicts.length > 0 ||
        (conflictedWsPaths.length > 0 && conflicts.length === 0)
      ) {
        store.dispatch({
          name: 'action::@bangle.io/github-storage:SET_CONFLICTED_WS_PATHS',
          value: {
            conflictedWsPaths: conflicts,
          },
        });
      }
    }
  });
}
