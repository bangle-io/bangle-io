import { makeDbRecord } from '@bangle.io/db-key-val';
import { calculateGitFileSha } from '@bangle.io/git-file-sha';
import type { PlainObjEntry } from '@bangle.io/remote-file-sync';
import {
  fileSync,
  isEntryUntouched,
  makeLocalEntryFromRemote,
  makeLocallyCreatedEntry,
} from '@bangle.io/remote-file-sync';
import type { WsPath } from '@bangle.io/shared-types';
import { assertSignal } from '@bangle.io/utils';
import { createWsPath, resolvePath } from '@bangle.io/ws-path';

import { LOCAL_ENTRIES_TABLE, openDatabase } from './database';
import { fileEntryManager } from './file-entry-manager';
import type { GHTree, GithubConfig } from './github-api-helpers';
import {
  commitToGithub,
  getFileBlobFromTree,
  resolveFilesFromGithub,
  serialGetRepoTree,
} from './github-api-helpers';
import { getNonConflictName } from './helpers';

interface LocalSyncOps {
  delete: string[];
  update: Array<{
    wsPath: string;
    remoteUrl: string;
    remoteSha: string;
    expectedLocalSha: string;
  }>;
  sourceUpdate: Array<{
    wsPath: string;
    expectedLocalSourceSha: string | undefined;
  }>;
}

interface RemoteSyncOps {
  delete: string[];
  update: Array<{ wsPath: string; file: File; sha: string }>;
}

interface LocalSyncOpsResolved {
  delete: LocalSyncOps['delete'];
  update: Array<LocalSyncOps['update'][0] & { remoteFile: File }>;
  sourceUpdate: LocalSyncOps['sourceUpdate'];
}

/**
 * Sync local and remote file entries
 */
export async function githubSync({
  wsName,
  config,
  abortSignal,
}: {
  wsName: string;
  config: GithubConfig;
  abortSignal: AbortSignal;
}) {
  const tree = await serialGetRepoTree({
    wsName,
    config,
  });

  assertSignal(abortSignal);

  const localEntriesArray = await fileEntryManager.listAllEntries(wsName);
  const { remoteOps, conflicts, localOps } = processSyncJob(
    localEntriesArray,
    tree,
  );

  // TODO make this non blocking
  if (conflicts.length > 0) {
    return {
      status: 'merge-conflict' as const,
      conflict: conflicts,
      count: conflicts.length,
    };
  }

  // NOTE: Do network requests before writing to gh and db
  // so that if there is a network error, we don't have to rollback
  // TODO make sure remoteSha  matches calculated sha
  const locOpsUpdateResolved: LocalSyncOpsResolved['update'] =
    await resolveFilesFromGithub(localOps.update, config, abortSignal);

  // !!! DONOT MAKE NETWORK REQUESTS AFTER THIS POINT

  // add, update and delete files in github
  await commitToGithub({
    additions: remoteOps.update,
    deletions: remoteOps.delete,
    abortSignal,
    sha: tree.sha,
    config,
  });

  const localOpsResolved: LocalSyncOpsResolved = {
    ...localOps,
    update: locOpsUpdateResolved,
  };

  await executeLocalChanges({
    localOps: localOpsResolved,
    remoteOps: remoteOps,
    abortSignal,
    config,
  });

  console.debug('Successfully synced with github');

  return {
    status: 'success' as const,
    count:
      localOps.delete.length +
      localOps.update.length +
      remoteOps.delete.length +
      remoteOps.update.length,
  };
}

// TODO add some rollback code if there is an error
async function executeLocalChanges({
  localOps,
  remoteOps,
  abortSignal,
  config,
}: {
  localOps: LocalSyncOpsResolved;
  remoteOps: RemoteSyncOps;
  abortSignal: AbortSignal;
  config: GithubConfig;
}) {
  assertSignal(abortSignal);

  const db = await openDatabase();
  const tx = db.transaction(LOCAL_ENTRIES_TABLE, 'readwrite', {
    durability: 'strict',
  });
  const store = tx.objectStore(LOCAL_ENTRIES_TABLE);
  let promises: Array<Promise<unknown>> = [];
  let skipped: string[] = [];

  const updateIfExists = async <R extends { wsPath: string }>(
    infoArray: R[],
    updater: (info: R, entryInDb: PlainObjEntry) => PlainObjEntry,
  ): Promise<void> => {
    for (const info of infoArray) {
      const { wsPath } = info;
      const existing = await store.get(wsPath);

      if (existing) {
        const newRecord = makeDbRecord(wsPath, updater(info, existing.value));

        promises.push(store.put(newRecord));
      } else {
        skipped.push(wsPath);
      }
    }
  };

  // Now that things are committed to github, we can update the source of local entries
  // so that we do not keep syncing them with github
  await updateIfExists(remoteOps.update, (remoteUpdate, entryInDb) => {
    return {
      ...entryInDb,
      source: {
        ...entryInDb.source,
        file: remoteUpdate.file,
        sha: remoteUpdate.sha,
      },
    };
  });

  // update localSourceUpdate
  await updateIfExists(localOps.sourceUpdate, (incoming, entryInDb) => {
    // only update if the source matches with the source at the time of sync
    // this also includes when both are undefined.
    if (entryInDb.source?.sha === incoming.expectedLocalSourceSha) {
      return {
        ...entryInDb,
        source: {
          ...entryInDb.source,
          file: entryInDb.file,
          sha: entryInDb.sha,
        },
      };
    }

    console.warn(
      `Skipping source update for ${incoming.wsPath} because source sha does not match with the one provided at sync.`,
    );

    skipped.push(incoming.wsPath);

    return entryInDb;
  });

  // update the local files
  await updateIfExists(localOps.update, (incomingEntry, entryInDb) => {
    if (entryInDb.sha !== incomingEntry.expectedLocalSha) {
      console.warn(
        `Local file "${entryInDb.uid}" has been modified since sync started. Skipping update`,
      );

      return entryInDb;
    }

    return {
      ...entryInDb,
      deleted: undefined,
      file: incomingEntry.remoteFile,
      sha: incomingEntry.remoteSha,
      source: {
        ...entryInDb.source,
        file: incomingEntry.remoteFile,
        sha: incomingEntry.remoteSha,
      },
    };
  });

  for (const uid of [
    // now that we have synced the deleted file, lets remove them from the local storage
    // completely!
    ...remoteOps.delete,
    // wsPaths that are in localDelete are the ones that have been deleted in
    // github, so we should remove the entry completely from the local storage
    ...localOps.delete,
  ]) {
    promises.push(store.delete(uid));
  }

  await Promise.all(promises);

  await tx.done;

  return { skipped };
}

/**
 * A safe (doesn't modify anything) function that compares remote and local entries
 * and returns information about what is needed to be done to sync them
 */
export function processSyncJob(localEntries: PlainObjEntry[], tree: GHTree) {
  const conflicts: string[] = [];

  const remoteOps: RemoteSyncOps = {
    update: [],
    delete: [],
  };
  const localOps: LocalSyncOps = {
    delete: [],
    update: [],
    sourceUpdate: [],
  };

  const REMOTE_FILE = 'fileB';
  const LOCAL_FILE = 'fileA';
  const ANCESTOR_FILE = 'ancestor';

  for (const localEntry of localEntries) {
    const uid = localEntry.uid;

    const rawRemote = tree.tree.get(uid);
    const local = {
      deleted: localEntry.deleted,
      sha: localEntry.sha,
      uid,
    };

    const ancestor: typeof local | undefined = localEntry.source
      ? {
          deleted: undefined,
          sha: localEntry.source.sha,
          uid,
        }
      : undefined;

    let remote: typeof local | undefined;

    if (rawRemote) {
      remote = {
        deleted: undefined,
        sha: rawRemote.sha,
        uid,
      };
    }
    // if a remote entry is not present but we have ancestor information,
    // it means the remote entry was deleted sometime ago.
    // We can conclude this because we can only have the ancestor info
    // if the remote entry was present in the past.
    else if (!rawRemote && ancestor) {
      remote = {
        deleted: Date.now(),
        sha: ancestor.sha,
        uid,
      };
    }

    const sync = fileSync({
      fileA: local,
      fileB: remote,
      ancestor,
    });

    const syncAction = sync.action;

    if (syncAction === 'noop') {
      continue;
    } else if (syncAction === 'conflict') {
      conflicts.push(uid);
      continue;
    } else if (syncAction === 'delete') {
      let target = sync.target;
      switch (target) {
        case REMOTE_FILE: {
          remoteOps.delete.push(uid);
          continue;
        }
        case LOCAL_FILE: {
          localOps.delete.push(uid);
          continue;
        }
        default: {
          let val: never = target;
          throw new Error('Unknown target');
        }
      }
    } else if (syncAction === 'set') {
      let target = sync.target;
      switch (target) {
        case REMOTE_FILE: {
          remoteOps.update.push({
            wsPath: uid,
            file: localEntry.file,
            sha: localEntry.sha,
          });
          continue;
        }

        case LOCAL_FILE: {
          if (!rawRemote) {
            throw new Error('Remote cannot be undefined');
          }

          localOps.update.push({
            wsPath: uid,
            // When updating the entry in db, use this to make sure
            // expectedLocalSha hasn't been modified
            // since the sync started.
            expectedLocalSha: localEntry.sha,
            remoteUrl: rawRemote.url,
            remoteSha: rawRemote.sha,
          });
          continue;
        }
        // This case ideally should not happen, unless
        // a previous sync encountered an error
        case ANCESTOR_FILE: {
          // adding it to localSourceUpdate will update the ancestor
          localOps.sourceUpdate.push({
            wsPath: uid,
            expectedLocalSourceSha: localEntry.source?.sha,
          });
          continue;
        }
        default: {
          let val: never = target;
          throw new Error('Unknown target');
        }
      }
    }

    let val: never = syncAction;
    throw new Error(`Unknown sync action: ${syncAction}`);
  }

  // Note: this makes up for the lack of `syncEntries` to provide
  // a way tell us to remove an already deleted local file entry which has also been
  // removed from github.
  // TODO: add a test for this
  localEntries
    .filter((entry) => entry.deleted && !tree.tree.has(entry.uid))
    .forEach((entry) => {
      localOps.delete.push(entry.uid);
    });

  return {
    conflicts,
    remoteOps,
    localOps,
  };
}

/**
 * Discards local changes and resets the file to its original (source) state
 * If the source does not exist, it will be deleted.
 * Note that unlike other methods, the file is reset to the source state and not the remote state.
 */
export async function discardLocalEntryChanges(wsPath: string) {
  const entry = await fileEntryManager.readEntry(wsPath);

  // if source does not exist, remove the file completely
  if (!entry?.source?.file) {
    console.debug('discardLocalChanges:removing file entry', wsPath);
    await fileEntryManager.removeEntry(wsPath);

    return true;
  }

  console.debug('resetting file entry to source', entry.uid);

  return fileEntryManager.resetCurrentToSource(wsPath);
}

/**
 * Duplicates the file with a non-conflicting wsPath and then resets
 * file to match remote content.
 * Note: the file is reset to the remote state.
 */
export async function duplicateAndResetToRemote({
  config,
  wsPath,
  abortSignal,
}: {
  config: GithubConfig;
  wsPath: string;
  abortSignal?: AbortSignal;
}): Promise<
  | undefined
  | {
      localContentWsPath: string;
      remoteContentWsPath: string;
    }
> {
  const existingEntry = await fileEntryManager.readEntry(wsPath);

  if (!existingEntry) {
    console.debug('No existing entry found for', wsPath);

    return undefined;
  }

  const tree = await serialGetRepoTree({
    wsName: resolvePath(wsPath).wsName,
    config,
    abortSignal,
  });

  const remoteFile = await getFileBlobFromTree({
    wsPath: wsPath,
    config,
    tree,
  });

  if (!remoteFile) {
    console.warn('No remote file found for', wsPath);

    return undefined;
  }

  const newNonConflictingName = getNonConflictName(wsPath);

  // create a duplicate file with a non-conflicting name
  await fileEntryManager.createEntry(
    makeLocallyCreatedEntry({
      uid: newNonConflictingName,
      file: existingEntry.file,
      sha: await calculateGitFileSha(existingEntry.file),
    }),
  );

  await fileEntryManager.updateSourceAndCurrent(wsPath, remoteFile);

  return {
    localContentWsPath: newNonConflictingName,
    remoteContentWsPath: wsPath,
  };
}

export async function getConflicts({
  wsName,
  config,
}: {
  config: GithubConfig;
  wsName: string;
}): Promise<WsPath[]> {
  const [tree, localEntries] = await Promise.all([
    serialGetRepoTree({
      wsName,
      config,
    }),
    fileEntryManager.listAllEntries(wsName),
  ]);

  const job = processSyncJob(localEntries, tree);

  return job.conflicts.map((item) => createWsPath(item));
}

export async function optimizeDatabase({
  wsName,
  config,
  retainedWsPaths,
  abortSignal,
  tree,
  pruneUnused,
}: {
  wsName: string;
  config: GithubConfig;
  retainedWsPaths: Set<string>;
  abortSignal: AbortSignal;
  tree: GHTree;
  pruneUnused: boolean;
}) {
  const localEntriesArray = await fileEntryManager.listAllEntries(wsName);
  const localEntriesKeySet = new Set(localEntriesArray.map((r) => r.uid));

  const downloadedFileInfo = await resolveFilesFromGithub(
    Array.from(retainedWsPaths)
      .map((wsPath) => {
        if (localEntriesKeySet.has(wsPath)) {
          return undefined;
        }
        const entry = tree.tree.get(wsPath);

        if (!entry) {
          return undefined;
        }

        return { wsPath, remoteUrl: entry.url, remoteSha: entry.sha };
      })
      .filter(
        (r): r is { wsPath: string; remoteUrl: string; remoteSha: string } =>
          r !== undefined,
      ),
    config,
    abortSignal,
  );

  assertSignal(abortSignal);

  // once all the async operations are done, we now focus on
  // database.
  const db = await openDatabase();
  const tx = db.transaction(LOCAL_ENTRIES_TABLE, 'readwrite');
  const store = tx.objectStore(LOCAL_ENTRIES_TABLE);

  let promises: Array<Promise<unknown>> = [];

  // The following code ensures that the downloaded files are
  // have a copy in database.
  for (const info of downloadedFileInfo) {
    const existing = await store.get(info.wsPath);

    if (!existing) {
      console.debug(
        'github-storage:optimizeDatabase:adding entry',
        info.wsPath,
      );
      promises.push(
        store.put(
          makeDbRecord(
            info.wsPath,
            makeLocalEntryFromRemote({
              uid: info.wsPath,
              file: info.remoteFile,
              sha: info.remoteSha,
            }),
          ),
        ),
      );
    }
  }

  if (pruneUnused) {
    // Remove certain entries to keep the local storage lean and clean
    // this is okay since a user can always fetch the file from github
    for (const entry of localEntriesArray) {
      if (isEntryUntouched(entry) && !retainedWsPaths.has(entry.uid)) {
        console.debug(
          'github-storage:optimizeDatabase:purging entry',
          entry.uid,
        );
        promises.push(store.delete(entry.uid));
      }
    }
  }

  await Promise.all(promises);
  await tx.done;

  return true;
}
