import { pMap } from '@bangle.io/p-map';
import {
  fileSync,
  LocalFileEntryManager,
  RemoteFileEntry,
} from '@bangle.io/remote-file-sync';
import { assertSignal, shuffleArray } from '@bangle.io/utils';

import { commitToGithub } from './github-writer';
import { WsMetadata } from './helpers';

export async function syncUntouchedEntries(
  abortSignal: AbortSignal,
  fileEntryManager: LocalFileEntryManager,
  wsName: string,
  getRemoteFileEntry: (uid: string) => Promise<RemoteFileEntry | undefined>,
) {
  // shuffle them so that we are not always updating the same ones
  // in case we get aborted early.
  const untouchedEntries = shuffleArray(
    (await fileEntryManager.getAllEntries(wsName + ':')).filter(
      (r) => !r.isModified && !r.deleted,
    ),
  );

  assertSignal(abortSignal);

  await pMap(
    untouchedEntries,
    async (entry) => {
      // TODO make sure the remote file is latest
      const remoteFileEntry = await getRemoteFileEntry(entry.uid);

      assertSignal(abortSignal);

      if (remoteFileEntry) {
        await fileEntryManager.updateFileEntry(remoteFileEntry.fork());
      } else {
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

  let result = (
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

  result = result.filter(
    (r) => r.result?.action === 'set' && r.result.target === 'fileB',
  );

  if (result.length === 0) {
    return 0;
  }

  await commitToGithub(
    result.map((r) => [r.entryA.uid, r.entryA.file]),
    [],
    wsName,
    {
      branch: wsMetadata.branch,
      owner: wsMetadata.owner,
      githubToken: wsMetadata.githubToken,
      repoName: wsName,
    },
  );

  for (const { entryA } of result) {
    console.log('applying update', entryA.sha);
    await fileEntryManager.updateFileSource(entryA.uid, entryA.file);
  }

  return result.length;
}
