import { pMap } from '@bangle.io/p-map';
import type { PlainObjEntry } from '@bangle.io/remote-file-sync';
import {
  fileSync,
  LocalFileEntry,
  RemoteFileEntry,
} from '@bangle.io/remote-file-sync';
import { assertSignal } from '@bangle.io/utils';
import { resolvePath } from '@bangle.io/ws-path';

import { fileManager } from './file-entry-manager';
import type { GHTree, GithubConfig } from './github-api-helpers';
import {
  commitToGithub,
  getFileBlobFromTree,
  getRepoTree,
} from './github-api-helpers';
import { getNonConflictName } from './helpers';

/**
 * Sync local and remote file entries
 */
export async function githubSync({
  wsName,
  config,
  retainedWsPaths,
  abortSignal,
}: {
  wsName: string;
  config: GithubConfig;
  // TODO move retainedWsPaths out of this function
  retainedWsPaths: Set<string>;
  abortSignal: AbortSignal;
}) {
  const [tree, localEntriesKey] = await Promise.all([
    getRepoTree()({
      wsName,
      config,
    }),

    // TODO should we omit soft deleted files?
    fileManager.listAllKeys(wsName),
  ]);

  const localEntriesKeySet = new Set(localEntriesKey);

  assertSignal(abortSignal);

  // make sure retained wsPaths are in the local storage
  await fileManager.bulkCreateEntry(
    await createPlainEntriesFromRemote(
      Array.from(retainedWsPaths).filter(
        (wsPath) => !localEntriesKeySet.has(wsPath),
      ),
      tree,
      config,
      abortSignal,
    ),
  );

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

  // Note: this makes up for the lack of `syncEntries` to provide
  // a way tell us to remove an already deleted local file entry which has also been
  // removed from github.
  // TODO: add a test for this
  await pMap(
    localEntriesArray,
    async (entry) => {
      if (entry.deleted && !tree.tree.has(entry.uid)) {
        await fileManager.removeEntry(entry.uid);
      }
    },
    {
      concurrency: 5,
      abortSignal,
    },
  );

  // TODO: this cleanup chore can be done somewhere else
  // Remove certain entries to keep the local storage lean and clean
  // this is okay since a user can always fetch the file from github
  await pMap(
    localEntriesArray.filter((entry) => {
      let r = LocalFileEntry.fromPlainObj(entry);

      return r.isUntouched && !retainedWsPaths.has(r.uid);
    }),
    async (entry) => {
      console.log(`Removing ${entry.uid}`);
      await fileManager.removeEntry(entry.uid);
    },
    {
      concurrency: 10,
      abortSignal,
    },
  );

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
  job: ReturnType<typeof processSyncJob>;
  abortSignal: AbortSignal;
  config: GithubConfig;
  tree: GHTree;
}) {
  // Now that things are committed to github, we can update the source of local entries
  // so that we do not keep syncing them with github
  // TODO what happens if this part fails?
  await pMap(
    job.remoteUpdate,
    async ({ wsPath, file }) => {
      await fileManager.updateSource(wsPath, file);
    },
    {
      concurrency: 5,
      abortSignal,
    },
  );

  // now that we have synced the deleted file, lets remove them from the local storage
  // completely!
  await pMap(
    job.remoteDelete,
    async (wsPath) => {
      await fileManager.removeEntry(wsPath);
    },
    {
      concurrency: 5,
      abortSignal,
    },
  );

  // update localSourceUpdate
  await pMap(
    job.localSourceUpdate,
    async (wsPath) => {
      // TODO we should update the source to the sha of the current file at
      // the time of sync. the current approach might trick us to think the file
      // is untouched (current sha === source sha).
      return fileManager.updateSourceToCurrentSha(wsPath);
    },
    {
      concurrency: 5,
      abortSignal,
    },
  );

  // update the local files
  await pMap(
    job.localUpdate,
    async (wsPath) => {
      const remoteFile = await getFileBlobFromTree({
        wsPath: wsPath,
        config,
        tree,
      });

      if (remoteFile) {
        console.info(
          'overwriteLocalEntryWithRemoteContent: Overwriting local file with remote file',
          wsPath,
        );
        // TODO the current should only be updated if it hasn't been modified
        // since since. Currently this will overwrite any changes after the sync
        await fileManager.updateSourceAndCurrent(wsPath, remoteFile);

        return;
      }

      // this should ideally not happen since we are are grabbing the file
      // by the sha from the tree, but since it is an external thing can't
      // be guaranteed.
      console.error('Expected remote file to exist: ', wsPath);
    },
    {
      concurrency: 5,
      abortSignal,
    },
  );

  // wsPaths that are in localDelete are the ones that have been deleted in
  // github, so we should remove the entry completely and not soft delete them by calling .deleteFile()
  await pMap(
    job.localDelete,
    async (wsPath) => {
      await fileManager.removeEntry(wsPath);
    },
    {
      concurrency: 5,
      abortSignal,
    },
  );
}

/**
 * A safe (doesn't modify anything) function that compares remote and local entries
 * and returns information about what is needed to be done to sync them
 */
export function processSyncJob(localEntries: PlainObjEntry[], tree: GHTree) {
  const conflicts: string[] = [];
  const remoteDelete: string[] = [];
  const remoteUpdate: Array<{ wsPath: string; file: File }> = [];
  const localDelete: string[] = [];
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
          remoteUpdate.push({ wsPath: uid, file: localEntry.file });
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

  const tree = await getRepoTree()({
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
    getRepoTree()({
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
