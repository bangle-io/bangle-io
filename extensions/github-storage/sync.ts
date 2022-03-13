import { pMap } from '@bangle.io/p-map';
import {
  fileSync,
  LocalFileEntryManager,
  RemoteFileEntry,
} from '@bangle.io/remote-file-sync';
import { assertSignal, shuffleArray } from '@bangle.io/utils';

import { GithubRepoTree } from './github-repo-tree';
import { commitToGithub } from './github-writer';
import { WsMetadata } from './helpers';

const LOG = true;

const log = LOG ? console.info.bind(console, 'GithubSync') : () => {};

export async function syncUntouchedEntries(
  abortSignal: AbortSignal,
  fileEntryManager: LocalFileEntryManager,
  wsName: string,
  wsMetadata: WsMetadata,
) {
  const allEntries = await fileEntryManager.getAllEntries(wsName + ':');
  log('all Entries', allEntries);

  // shuffle them so that we are not always updating the same ones
  // in case we get aborted early.
  const untouchedEntries = shuffleArray(
    allEntries.filter((r) => r.isUntouched),
  );

  log('untouchedEntries', untouchedEntries);

  assertSignal(abortSignal);

  await pMap(
    untouchedEntries,
    async (entry) => {
      const file = await GithubRepoTree.getFileBlob(entry.uid, wsMetadata);

      const remoteFileEntry =
        file &&
        (await RemoteFileEntry.newFile({
          uid: entry.uid,
          file: file,
          deleted: undefined,
        }));

      assertSignal(abortSignal);

      if (remoteFileEntry) {
        log('updating entry', entry.uid);
        await fileEntryManager.updateFileEntry(remoteFileEntry.fork());
      } else {
        log('removing entry', entry.uid);
        await fileEntryManager.removeFileEntry(entry.uid);
      }
    },
    {
      concurrency: 3,
      abortSignal,
    },
  );

  return untouchedEntries.length;
}

export async function pushModifiedOrCreatedEntries(
  abortSignal: AbortSignal,
  fileEntryManager: LocalFileEntryManager,
  wsName: string,
  wsMetadata: WsMetadata,
  getRemoteFileEntry: (uid: string) => Promise<RemoteFileEntry | undefined>,
) {
  const entries = (await fileEntryManager.getAllEntries(wsName + ':')).filter(
    (entry) => entry.isModified || entry.isNew,
  );

  console.log('to push', entries);
  let syncResult = (
    await pMap(
      entries,
      async (e) => {
        const source = e.source
          ? {
              sha: e.source.sha,
              file: e.source.file,
              uid: e.uid,
              deleted: undefined,
            }
          : undefined;

        const entryA = {
          sha: e.sha,
          file: e.file,
          uid: e.uid,
          deleted: undefined,
        };

        const remoteEntry = await getRemoteFileEntry(e.uid);

        const entryB = remoteEntry
          ? {
              sha: remoteEntry.sha,
              file: remoteEntry.file,
              uid: remoteEntry.uid,
              deleted: remoteEntry.deleted,
            }
          : undefined;

        const sync = await fileSync(entryA, entryB, source);
        return {
          entryA: entryA,
          entryB: entryB,
          result: sync,
        };
      },
      { concurrency: 5, abortSignal: new AbortController().signal },
    )
  ).filter(Boolean);

  console.log('sync result', syncResult);

  const toCommit = syncResult.filter(
    (r) => r.result?.action === 'set' && r.result.target === 'fileB',
  );

  if (toCommit.length > 0) {
    log('commited to github', toCommit);
    await commitToGithub(
      toCommit.map((r) => [r.entryA.uid, r.entryA.file]),
      [],
      wsName,
      {
        branch: wsMetadata.branch,
        owner: wsMetadata.owner,
        githubToken: wsMetadata.githubToken,
        repoName: wsName,
      },
    );
  }

  for (const { entryA, result } of syncResult) {
    if (result?.action === 'conflict') {
      continue;
    }

    log('applying update', entryA.sha);
    // TODO this can throw error we should not stop all updates if one fails
    await fileEntryManager.updateFileSource(entryA.uid, entryA.file);
  }

  return syncResult.length;
}
