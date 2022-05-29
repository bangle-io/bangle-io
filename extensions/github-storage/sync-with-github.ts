import { pMap } from '@bangle.io/p-map';
import {
  fileSync,
  LocalFileEntry,
  LocalFileEntryManager,
  RemoteFileEntry,
} from '@bangle.io/remote-file-sync';
import { assertSignal } from '@bangle.io/utils';

import {
  commitToGithub,
  getFileBlobFromTree,
  GHTree,
} from './github-api-helpers';
import { GithubWsMetadata } from './helpers';

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
}): Promise<number> {
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
        const remoteFile = await getFileBlobFromTree({
          wsPath,
          config,
          tree,
        });

        if (remoteFile) {
          const remoteEntry = await RemoteFileEntry.newFile({
            uid: wsPath,
            file: remoteFile,
            deleted: undefined,
          });
          await fileEntryManager.updateFileEntry(
            remoteEntry.forkLocalFileEntry(),
          );
        }
      }
    },
    {
      concurrency: 10,
      abortSignal,
    },
  );

  const { remoteDelete, remoteUpdate, conflicts, localUpdate, localDelete } =
    await syncEntries(localEntriesMap, tree);

  if (conflicts.length > 0) {
    throw new Error(
      `Conflicts not yet supported. ${conflicts.length} conflicts detected`,
    );
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

  await pMap(
    localUpdate,
    async (wsPath) => {
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

        await fileEntryManager.updateFileEntry(
          remoteEntry.forkLocalFileEntry(),
        );
      } else {
        // this should ideally not happen since we are are grabbing the file
        // by the sha from the tree, but since it is an external thing can't
        // be guaranteed.
        console.error('Expected remote file to exist: ', wsPath);
      }
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

  return (
    localDelete.length +
    localUpdate.length +
    remoteDelete.length +
    remoteUpdate.length
  );
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

  for (const [uid, localEntry] of localEntries) {
    const rawRemote = tree.tree.get(uid);
    const local = {
      deleted: localEntry.deleted,
      sha: localEntry.sha,
      uid,
    };

    let remote: typeof local | undefined = rawRemote
      ? {
          deleted: undefined,
          sha: rawRemote.sha,
          uid,
        }
      : undefined;

    const ancestor: typeof local | undefined = localEntry.source
      ? {
          deleted: undefined,
          sha: localEntry.source.sha,
          uid,
        }
      : undefined;

    const sync = fileSync({
      fileA: local,
      fileB: remote,
      ancestor,
    });

    const isRemoteChange = sync.target === 'fileB';
    const syncAction = sync.action;

    if (syncAction === 'noop') {
      continue;
    } else if (syncAction === 'conflict') {
      conflicts.push(uid);
      continue;
    } else if (syncAction === 'delete') {
      if (isRemoteChange) {
        remoteDelete.push(uid);
      } else {
        localDelete.push(uid);
      }
      continue;
    } else if (syncAction === 'set') {
      if (isRemoteChange) {
        remoteUpdate.push({ wsPath: uid, file: localEntry.file });
      } else {
        localUpdate.push(uid);
      }
      continue;
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
  };
}
