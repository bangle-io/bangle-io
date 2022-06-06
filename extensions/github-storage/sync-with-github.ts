import { pMap } from '@bangle.io/p-map';
import type {
  LocalFileEntry,
  LocalFileEntryManager,
} from '@bangle.io/remote-file-sync';
import { fileSync, RemoteFileEntry } from '@bangle.io/remote-file-sync';
import { assertSignal } from '@bangle.io/utils';

import type { GHTree, GithubConfig } from './github-api-helpers';
import { commitToGithub, getFileBlobFromTree } from './github-api-helpers';
import type { GithubWsMetadata } from './helpers';

const LOG = true;
const log = LOG ? console.log.bind(console, 'GithubSync') : () => {};

export async function pushLocalChanges({
  abortSignal,
  fileEntryManager,
  ghConfig,
  retainedWsPaths,
  tree,
  wsName,
}: {
  abortSignal: AbortSignal;
  fileEntryManager: LocalFileEntryManager;
  ghConfig: GithubWsMetadata;
  retainedWsPaths: Set<string>;
  tree: GHTree;
  wsName: string;
}) {
  const repoName = wsName;
  const config = { ...ghConfig, repoName: wsName };
  const localEntries = await fileEntryManager.getAllEntries(wsName + ':');
  const localEntriesMap = new Map(
    localEntries.map((entry) => [entry.uid, entry]),
  );

  assertSignal(abortSignal);

  // make sure retained ws paths are in the local storage
  await pMap(
    retainedWsPaths,
    async (wsPath) => {
      if (!localEntriesMap.has(wsPath)) {
        await overwriteLocalEntryFromRemote({
          config,
          fileEntryManager,
          tree,
          wsPath,
        });
      }
    },
    {
      concurrency: 10,
      abortSignal,
    },
  );

  const {
    remoteDelete,
    remoteUpdate,
    conflicts,
    localUpdate,
    localDelete,
    localSourceUpdate,
  } = await syncEntries(localEntriesMap, tree);

  if (conflicts.length > 0) {
    console.log(conflicts);

    return {
      status: 'merge-conflict' as const,
      count: conflicts.length,
    };
  }

  // add, update and delete files in github
  await commitToGithub({
    repoName,
    additions: remoteUpdate,
    deletions: remoteDelete,
    abortSignal,
    sha: tree.sha,
    config,
  });

  // Now that things are committed to github, we can update the source of local entries
  // so that we donot keep syncing them with github
  // TODO what happens if this part fails?
  await pMap(
    remoteUpdate,
    async ({ wsPath, file }) => {
      await fileEntryManager.updateFileSource(wsPath, file);
    },
    {
      concurrency: 5,
      abortSignal,
    },
  );

  // now that we have synced the deleted file, lets remove them from the local storage
  // completely!
  await pMap(
    remoteDelete,
    async (wsPath) => {
      await fileEntryManager.removeFileEntry(wsPath);
    },
    {
      concurrency: 5,
      abortSignal,
    },
  );

  // update the local files
  await pMap(
    [...localUpdate, ...localSourceUpdate],
    async (wsPath) => {
      await overwriteLocalEntryFromRemote({
        config,
        fileEntryManager,
        tree,
        wsPath,
      });
    },
    {
      concurrency: 5,
      abortSignal,
    },
  );

  // wsPaths that are in localDelete are the ones that have been deleted in
  // github, so we should remove the entry completely and not soft delete them by calling .deleteFile()
  await pMap(
    localDelete,
    async (wsPath) => {
      await fileEntryManager.removeFileEntry(wsPath);
    },
    {
      concurrency: 5,
      abortSignal,
    },
  );

  // Note: this makes up for the lack of `syncEntries` to provide
  // a way tell us to remove an already deleted local file entry which has also been
  // removed from github.
  // TODO: add a test for this
  await pMap(
    localEntries,
    async (entry) => {
      if (entry.isDeleted && !tree.tree.has(entry.uid)) {
        await fileEntryManager.removeFileEntry(entry.uid);
      }
    },
    {
      concurrency: 5,
      abortSignal,
    },
  );

  // Remove certain entries to keep the local storage lean and clean
  // this is okay since a user can always fetch the file from github
  await pMap(
    localEntries.filter((r) => {
      return r.isUntouched && !retainedWsPaths.has(r.uid);
    }),
    async (entry) => {
      log(`Removing ${entry.uid}`);
      await fileEntryManager.removeFileEntry(entry.uid);
    },
    {
      concurrency: 10,
      abortSignal,
    },
  );

  return {
    status: 'success' as const,
    count:
      localDelete.length +
      localUpdate.length +
      remoteDelete.length +
      remoteUpdate.length,
  };
}

async function syncEntries(
  localEntries: Map<string, LocalFileEntry>,
  tree: GHTree,
) {
  const conflicts: string[] = [];
  const remoteDelete: string[] = [];
  const remoteUpdate: Array<{ wsPath: string; file: File }> = [];
  const localDelete: string[] = [];
  const localUpdate: string[] = [];
  const localSourceUpdate: string[] = [];
  const REMOTE_FILE = 'fileB';
  const LOCAL_FILE = 'fileA';
  const ANCESTOR_FILE = 'ancestor';

  for (const [uid, localEntry] of localEntries) {
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
          // adding it to localUpdate will update the ancestor
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
 * Caution this will overwrite the local file with the remote file
 * regardless of whether local file is modified or not
 */
async function overwriteLocalEntryFromRemote({
  config,
  fileEntryManager,
  tree,
  wsPath,
}: {
  config: GithubConfig;
  fileEntryManager: LocalFileEntryManager;
  tree: GHTree;
  wsPath: string;
}) {
  const remoteFile = await getFileBlobFromTree({
    wsPath: wsPath,
    config,
    tree,
  });

  if (remoteFile) {
    const remoteEntry = await RemoteFileEntry.newFile({
      uid: wsPath,
      file: remoteFile,
      deleted: undefined,
    });

    await fileEntryManager.overwriteFileEntry(remoteEntry.forkLocalFileEntry());
  } else {
    // this should ideally not happen since we are are grabbing the file
    // by the sha from the tree, but since it is an external thing can't
    // be guaranteed.
    console.error('Expected remote file to exist: ', wsPath);
  }
}
