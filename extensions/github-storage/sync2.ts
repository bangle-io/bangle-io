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

import { pushChanges } from './github-api-helpers';
import { GithubWsMetadata } from './helpers';

const LOG = true;
const log = LOG
  ? console.log.bind(console, 'GithubSync/pushLocalChanges')
  : () => {};

interface SyncEntry {
  local: LocalFileEntry;
  remote: RemoteFileEntry | undefined;
}

const fileToBase64 = async (file: File) => {
  const buffer = await file.arrayBuffer();

  return base64.fromByteArray(new Uint8Array(buffer));
};

export async function pushLocalChanges(
  // the entries that have changed
  entries: Map<string, SyncEntry>,
  abortSignal: AbortSignal,
  repoName: string,
  ghConfig: GithubWsMetadata,
  // the expected sha of the head of the branch
  sha: string,
  fileEntryManager: LocalFileEntryManager,
): Promise<void> {
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
    // TODO once a file has been pushed to github update the local entries' source
    await commitToGithub(
      repoName,
      additions,
      deletions,
      abortSignal,
      sha,
      ghConfig,
    );

    // update local entries to have source updated
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
    debugger;
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
  const commitBody = `Commit auto generated by "${window.location.host}"`;

  let commitHeadline = 'Bangle.io: ';

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
