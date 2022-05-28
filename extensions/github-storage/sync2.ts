import base64 from 'base64-js';

import { wsPathHelpers } from '@bangle.io/api';
import { pMap } from '@bangle.io/p-map';
import {
  fileSync,
  LocalFileEntry,
  LocalFileEntryManager,
  RemoteFileEntry,
} from '@bangle.io/remote-file-sync';
import { assertNotUndefined, assertSignal } from '@bangle.io/utils';

import { getFileBlobFromTree, GHTree, pushChanges } from './github-api-helpers';
import { GithubWsMetadata } from './helpers';

const LOG = true;
const log = LOG ? console.log.bind(console, 'GithubSync') : () => {};

interface SyncEntry {
  local: LocalFileEntry;
  remote: RemoteFileEntry | undefined;
}

const fileToBase64 = async (file: File) => {
  const buffer = await file.arrayBuffer();

  return base64.fromByteArray(new Uint8Array(buffer));
};

export async function houseKeeping({
  abortSignal = new AbortController().signal,
  fileEntryManager,
  ghConfig,
  retainedWsPaths,
  tree,
  wsName,
}: {
  abortSignal?: AbortSignal;
  fileEntryManager: LocalFileEntryManager;
  ghConfig: GithubWsMetadata;
  retainedWsPaths: Set<string>;
  tree: GHTree;
  wsName: string;
}) {
  const allEntries = await fileEntryManager.getAllEntries(wsName + ':');

  // Remove all entries to keep the local storage lean and clean
  // this is okay since a user can always fetch the file from github
  await pMap(
    allEntries.filter((r) => {
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

  const allEntriesMap = new Map(allEntries.map((entry) => [entry.uid, entry]));

  const config = { ...ghConfig, repoName: wsName };

  let updatedWsPaths: string[] = [];
  let removedWsPaths: string[] = [];

  await pMap(
    retainedWsPaths,
    async (retainedWsPath) => {
      const localEntry = allEntriesMap.get(retainedWsPath);

      if (localEntry && !localEntry.isUntouched) {
        return;
      }

      const ghInfo = tree.tree.get(retainedWsPath);

      // skip updating if files are the same
      if (ghInfo?.sha === localEntry?.sha) {
        return;
      }

      const remoteFile = await getFileBlobFromTree({
        wsPath: retainedWsPath,
        config,
        tree,
      });

      if (remoteFile) {
        updatedWsPaths.push(retainedWsPath);
        const remoteEntry = await RemoteFileEntry.newFile({
          uid: retainedWsPath,
          file: remoteFile,
          deleted: undefined,
        });
        log('updating file ', retainedWsPath, localEntry, ghInfo);

        await fileEntryManager.updateFileEntry(
          remoteEntry.forkLocalFileEntry(),
        );
      } else if (localEntry) {
        removedWsPaths.push(retainedWsPath);

        log('removing file ', retainedWsPath);

        await fileEntryManager.removeFileEntry(retainedWsPath);
      }
    },
    {
      concurrency: 5,
      abortSignal,
    },
  );

  return { updatedWsPaths, removedWsPaths };
}

export async function pushLocalChanges({
  abortSignal,
  fileEntryManager,
  ghConfig,
  tree,
  wsName,
}: {
  abortSignal: AbortSignal;
  fileEntryManager: LocalFileEntryManager;
  ghConfig: GithubWsMetadata;
  tree: GHTree;
  wsName: string;
}): Promise<void> {
  const repoName = wsName;
  const config = { ...ghConfig, repoName: wsName };
  const localEntries = await fileEntryManager.getAllEntries(wsName + ':');
  // the entries that have changed
  let entries: Map<string, SyncEntry> = new Map(
    await pMap(
      localEntries.filter((entry) => !entry.isUntouched),
      async (entry): Promise<[string, SyncEntry]> => {
        const remoteFile = await getFileBlobFromTree({
          wsPath: entry.uid,
          config,
          tree,
        });

        return [
          entry.uid,
          {
            local: entry,
            remote: !remoteFile
              ? undefined
              : await RemoteFileEntry.newFile({
                  uid: entry.uid,
                  file: remoteFile,
                  deleted: undefined,
                }),
          },
        ];
      },
      {
        concurrency: 10,
        abortSignal: new AbortController().signal,
      },
    ),
  );

  assertSignal(abortSignal);

  const { githubDelete, githubUpdate, conflicts, localUpdate, localDelete } =
    await syncEntries(entries);

  const additions = githubUpdate.map((e): [string, File] => [
    e.local.uid,
    e.local.file,
  ]);
  const deletions = githubDelete.map((r) => r.local.uid);

  // TODO conflicts
  if (conflicts.length > 0) {
    throw new Error(
      `Conflicts not yet supported. ${conflicts.length} conflicts detected`,
    );
  }

  // deal with github
  if (githubDelete.length > 0 || githubUpdate.length > 0) {
    await commitToGithub(
      repoName,
      additions,
      deletions,
      abortSignal,
      tree.sha,
      ghConfig,
    );

    // update local entries to have source updated
    // for the githubUpdate list only
    // TODO what happens if this part fails?
    await pMap(
      githubUpdate,
      async (entry) => {
        await fileEntryManager.updateFileSource(
          entry.local.uid,
          entry.local.file,
        );
      },
      {
        concurrency: 5,
        abortSignal,
      },
    );
  }

  await pMap(
    localUpdate,
    async (entry) => {
      const remoteEntry = entry.remote;
      assertNotUndefined(
        remoteEntry,
        'Remote entry must exist when updating local file',
      );
      await fileEntryManager.updateFileEntry(remoteEntry.forkLocalFileEntry());
    },
    {
      concurrency: 5,
      abortSignal,
    },
  );
  await pMap(
    localDelete,
    async (entry) => {
      await fileEntryManager.deleteFile(entry.local.uid);
    },
    {
      concurrency: 5,
      abortSignal,
    },
  );
}

/**
 * commits the changes to github
 */
async function commitToGithub(
  repoName: string,
  additions: Array<[string, File]>,
  deletions: string[],
  abortSignal: AbortSignal,
  sha: string,
  ghConfig: GithubWsMetadata,
) {
  const { commitBody, commitHeadline } = makeGitCommitMessage(
    additions,
    deletions,
  );
  await pushChanges({
    abortSignal,
    headSha: sha,
    commitMessage: {
      headline: commitHeadline,
      body: commitBody,
    },
    additions: await Promise.all(
      additions.map(async ([wsPath, file]) => {
        return {
          base64Content: await fileToBase64(file),
          path: wsPathHelpers.resolvePath(wsPath, true).filePath,
        };
      }),
    ),
    deletions: deletions.map((wsPath) => {
      const { filePath } = wsPathHelpers.resolvePath(wsPath, true);

      return { path: filePath };
    }),
    config: {
      ...ghConfig,
      repoName,
    },
  });
}

function makeGitCommitMessage(
  additions: Array<[string, File]>,
  deletions: string[],
) {
  let commitBy =
    typeof window === 'undefined' ? 'https:://bangle.io' : window.location.host;

  const commitBody = `Commit auto generated by ${commitBy}`;

  let commitHeadline = 'Bangle.io : ';

  let firstAddition =
    additions[0] && wsPathHelpers.resolvePath(additions[0][0]).fileName;

  let secondAddition =
    additions[1] && wsPathHelpers.resolvePath(additions[1][0]).fileName;

  let firstDeletion =
    deletions[0] && wsPathHelpers.resolvePath(deletions[0]).fileName;

  if (firstAddition) {
    commitHeadline += `Update ${firstAddition}`;

    if (secondAddition && additions.length === 2) {
      commitHeadline += ` and ${secondAddition}`;
    } else if (additions.length > 2) {
      commitHeadline += ` and ${additions.length - 1} more`;
    }

    commitHeadline += ';';
  }

  if (firstDeletion) {
    if (commitHeadline.endsWith(';')) {
      commitHeadline += ' ';
    }

    commitHeadline += `Delete ${firstDeletion}`;

    if (deletions.length > 1) {
      commitHeadline += ` and ${deletions.length - 1} more`;
    }

    commitHeadline += ';';
  }

  return {
    commitBody,
    commitHeadline,
  };
}

async function syncEntries(entries: Map<string, SyncEntry>) {
  const conflicts: SyncEntry[] = [];
  const githubDelete: SyncEntry[] = [];
  const githubUpdate: SyncEntry[] = [];
  const localDelete: SyncEntry[] = [];
  const localUpdate: SyncEntry[] = [];

  for (const [, entry] of entries) {
    const source = entry.local.source
      ? {
          sha: entry.local.source.sha,
          file: entry.local.source.file,
          uid: entry.local.uid,
          deleted: undefined,
        }
      : undefined;

    const entryA = {
      sha: entry.local.sha,
      file: entry.local.file,
      uid: entry.local.uid,
      deleted: entry.local.deleted,
    };

    const entryB = entry.remote
      ? {
          sha: entry.remote.sha,
          file: entry.remote.file,
          uid: entry.remote.uid,
          deleted: entry.remote.deleted,
        }
      : undefined;

    const sync = fileSync(entryA, entryB, source);

    const syncAction = sync?.action;

    if (!syncAction) {
      continue;
    }

    if (syncAction === 'conflict') {
      conflicts.push(entry);
      continue;
    }

    const needsRemoteUpdate = sync.target === 'fileB';

    if (syncAction === 'delete') {
      if (needsRemoteUpdate) {
        githubDelete.push(entry);
      } else {
        localDelete.push(entry);
      }
      continue;
    }

    if (syncAction === 'set') {
      if (needsRemoteUpdate) {
        githubUpdate.push(entry);
      } else {
        localUpdate.push(entry);
      }

      continue;
    }

    // hack to catch switch slipping
    let val: never = syncAction;
    throw new Error(`Unknown sync action: ${syncAction}`);
  }

  return {
    conflicts,
    githubDelete,
    githubUpdate,
    localDelete,
    localUpdate,
  };
}
