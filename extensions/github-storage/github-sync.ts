import { makeDbRecord } from '@bangle.io/db-key-val';
import { pMap } from '@bangle.io/p-map';
import type { PlainObjEntry } from '@bangle.io/remote-file-sync';
import {
  fileSync,
  LocalFileEntry,
  RemoteFileEntry,
} from '@bangle.io/remote-file-sync';
import { assertSignal } from '@bangle.io/utils';
import { resolvePath } from '@bangle.io/ws-path';

import { LOCAL_ENTRIES_TABLE, openDatabase } from './database';
import { fileManager } from './file-entry-manager';
import type { GHTree, GithubConfig } from './github-api-helpers';
import {
  commitToGithub,
  getFileBlobFromTree,
  serialGetRepoTree,
} from './github-api-helpers';
import { getNonConflictName } from './helpers';

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

  const localEntriesArray = await fileManager.listAllEntries(wsName);
  const job = processSyncJob(localEntriesArray, tree);

  // TODO make this non blocking
  if (job.conflicts.length > 0) {
    return {
      status: 'merge-conflict' as const,
      conflict: job.conflicts,
      count: job.conflicts.length,
    };
  }

  // add, update and delete files in github
  await commitToGithub({
    additions: job.remoteUpdate,
    deletions: job.remoteDelete,
    abortSignal,
    sha: tree.sha,
    config,
  });

  await executeLocalChanges({
    job,
    abortSignal,
    config,
    tree,
  });

  console.debug('Successfully synced with github');

  return {
    status: 'success' as const,
    count:
      job.localDelete.length +
      job.localUpdate.length +
      job.remoteDelete.length +
      job.remoteUpdate.length,
  };
}

async function executeLocalChanges({
  job,
  abortSignal,
  config,
  tree,
}: {
  job: Awaited<ReturnType<typeof processSyncJob>>;
  abortSignal: AbortSignal;
  config: GithubConfig;
  tree: GHTree;
}) {
  assertSignal(abortSignal);

  const updatedEntriesFromRemote = await createPlainEntriesFromRemote(
    job.localUpdate,
    tree,
    config,
    abortSignal,
  );

  const db = await openDatabase();
  const tx = db.transaction(LOCAL_ENTRIES_TABLE, 'readwrite');
  const store = tx.objectStore(LOCAL_ENTRIES_TABLE);
  let promises: Array<Promise<unknown>> = [];
  let missing: string[] = [];

  const updateIfExists = async <R>(
    infoArray: Array<[string, R]>,
    updater: (info: [string, R], entryInDb: PlainObjEntry) => PlainObjEntry,
  ): Promise<void> => {
    for (const info of infoArray) {
      const wsPath = info[0];

      const existing = await store.get(wsPath);

      if (existing) {
        const newRecord = makeDbRecord(wsPath, updater(info, existing.value));

        promises.push(store.put(newRecord));
      } else {
        missing.push(wsPath);
      }
    }
  };

  // Now that things are committed to github, we can update the source of local entries
  // so that we do not keep syncing them with github
  // TODO what happens if this part fails?
  await updateIfExists(
    job.remoteUpdate.map((info) => [info.wsPath, info]),
    ([wsPath, info], entryInDb) => {
      return {
        ...entryInDb,
        source: {
          ...entryInDb.source,
          file: info.file,
          sha: info.sha,
        },
      };
    },
  );

  // update localSourceUpdate
  // TODO we should update the source to the sha of the current file at
  // the time of sync. the current approach might trick us to think the file
  // is untouched (current sha === source sha).
  await updateIfExists(
    job.localSourceUpdate.map((wsPath) => [wsPath, null]),
    (_, entryInDb) => {
      return {
        ...entryInDb,
        source: {
          ...entryInDb.source,
          file: entryInDb.file,
          sha: entryInDb.sha,
        },
      };
    },
  );

  // update the local files
  // TODO the current should only be updated if it hasn't been modified
  // since since. Currently this will overwrite any changes after the sync
  await updateIfExists(
    updatedEntriesFromRemote.map((e) => [e.uid, e]),
    ([wsPath, incomingEntry], entryInDb) => {
      return {
        ...entryInDb,
        deleted: undefined,
        file: incomingEntry.file,
        sha: incomingEntry.sha,
        source: {
          ...entryInDb.source,
          file: incomingEntry.file,
          sha: incomingEntry.sha,
        },
      };
    },
  );

  for (const uid of [
    // now that we have synced the deleted file, lets remove them from the local storage
    // completely!
    ...job.remoteDelete,
    // wsPaths that are in localDelete are the ones that have been deleted in
    // github, so we should remove the entry completely and not soft delete them by calling .deleteFile()
    ...job.localDelete,
  ]) {
    promises.push(store.delete(uid));
  }

  await Promise.all(promises);

  await tx.done;
}

/**
 * A safe (doesn't modify anything) function that compares remote and local entries
 * and returns information about what is needed to be done to sync them
 */
export function processSyncJob(localEntries: PlainObjEntry[], tree: GHTree) {
  const conflicts: string[] = [];
  const remoteDelete: string[] = [];
  const remoteUpdate: Array<{ wsPath: string; file: File; sha: string }> = [];
  let localDelete: string[] = [];
  const localUpdate: string[] = [];
  const localSourceUpdate: string[] = [];
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
          remoteDelete.push(uid);
          continue;
        }
        case LOCAL_FILE: {
          localDelete.push(uid);
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
          remoteUpdate.push({
            wsPath: uid,
            file: localEntry.file,
            sha: localEntry.sha,
          });
          continue;
        }
        case LOCAL_FILE: {
          localUpdate.push(uid);
          continue;
        }
        // This case ideally should not happen, unless
        // a previous sync encountered an error
        case ANCESTOR_FILE: {
          // adding it to localSourceUpdate will update the ancestor
          localSourceUpdate.push(uid);
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
      localDelete.push(entry.uid);
    });

  return {
    conflicts,
    remoteDelete,
    remoteUpdate,
    localDelete,
    localUpdate,
    localSourceUpdate,
  };
}

/**
 * Discards local changes and resets the file to its original (source) state
 * If the source does not exist, it will be deleted.
 * Note that unlike other methods, the file is reset to the source state and not the remote state.
 */
export async function discardLocalEntryChanges(wsPath: string) {
  const entry = await fileManager.readEntry(wsPath);

  // if source does not exist, remove the file completely
  if (!entry?.source?.file) {
    console.debug('discardLocalChanges:removing file entry', wsPath);
    await fileManager.removeEntry(wsPath);

    return true;
  }

  console.debug('resetting file entry to source', entry.uid);

  return fileManager.resetCurrentToSource(wsPath);
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
  const existingEntry = await fileManager.readEntry(wsPath);

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

  const newFilePath = getNonConflictName(wsPath);

  const localChangesEntry = (
    await LocalFileEntry.newFile({
      uid: newFilePath,
      file: existingEntry.file,
    })
  ).toPlainObj();

  // create a duplicate file with a non-conflicting name
  await fileManager.createEntry(localChangesEntry);

  await fileManager.updateSourceAndCurrent(wsPath, remoteFile);

  return {
    localContentWsPath: newFilePath,
    remoteContentWsPath: wsPath,
  };
}

export async function getConflicts({
  wsName,
  config,
}: {
  config: GithubConfig;
  wsName: string;
}): Promise<string[]> {
  const [tree, localEntries] = await Promise.all([
    serialGetRepoTree({
      wsName,
      config,
    }),
    fileManager.listAllEntries(wsName),
  ]);

  const job = processSyncJob(localEntries, tree);

  return job.conflicts;
}

async function createPlainEntriesFromRemote(
  wsPaths: string[],
  tree: GHTree,
  config: GithubConfig,
  abortSignal: AbortSignal,
) {
  let result: PlainObjEntry[] = [];

  await pMap(
    wsPaths,
    async (wsPath) => {
      const remoteFile = await getFileBlobFromTree({
        wsPath,
        config,
        tree,
      });

      if (remoteFile) {
        const obj = (
          await RemoteFileEntry.newFile({
            uid: wsPath,
            file: remoteFile,
            deleted: undefined,
          })
        )
          .forkLocalFileEntry()
          .toPlainObj();
        result.push(obj);
      }
    },
    {
      concurrency: 10,
      abortSignal,
    },
  );

  return result;
}

// TODO write a test for this
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
  const localEntriesArray = await fileManager.listAllEntries(wsName);
  const localEntriesKeySet = new Set(localEntriesArray.map((r) => r.uid));
  const plainRemoteEntries = await createPlainEntriesFromRemote(
    Array.from(retainedWsPaths).filter(
      (wsPath) => !localEntriesKeySet.has(wsPath),
    ),
    tree,
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

  // make sure retained wsPaths are in the local storage

  for (const entry of plainRemoteEntries) {
    const existing = await store.get(entry.uid);

    if (!existing) {
      console.debug('github-storage:optimizeDatabase:adding entry', entry.uid);
      promises.push(store.put(makeDbRecord(entry.uid, entry)));
    }
  }

  if (pruneUnused) {
    // Remove certain entries to keep the local storage lean and clean
    // this is okay since a user can always fetch the file from github
    for (const entry of localEntriesArray) {
      let r = LocalFileEntry.fromPlainObj(entry);

      if (r.isUntouched && !retainedWsPaths.has(r.uid)) {
        console.debug(
          'github-storage:optimizeDatabase:purging entry',
          entry.uid,
        );
        promises.push(store.delete(r.uid));
      }
    }
  }

  await Promise.all(promises);
  await tx.done;

  return true;
}
