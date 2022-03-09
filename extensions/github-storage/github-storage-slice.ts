import { ApplicationStore, Slice, SliceKey } from '@bangle.io/create-store';
import { pMap } from '@bangle.io/p-map';
import { fileSync } from '@bangle.io/remote-file-sync';
import {
  getStorageProviderOpts,
  workspaceSliceKey,
} from '@bangle.io/slice-workspace';

import { GithubStorageProvider } from './github-storage-provider';
import { commitToGithub } from './github-writer';
import { WsMetadata } from './helpers';

const sliceKey = new SliceKey('slice::@bangle.io/github-storage:slice-key');

export function githubStorageSlice(
  githubStorageProvider: GithubStorageProvider,
) {
  return new Slice({
    key: sliceKey,

    sideEffect() {
      let staredProcessing = false;

      const exec = async (store: ApplicationStore) => {
        const wsName = workspaceSliceKey.getSliceStateAsserted(
          store.state,
        ).wsName;
        if (!wsName) {
          return;
        }

        const storageOpts = getStorageProviderOpts()(
          store.state,
          store.dispatch,
        );

        if (storageOpts.storageProviderName !== githubStorageProvider.name) {
          return;
        }

        const entries =
          await githubStorageProvider.fileEntryManager.getAllEntries();

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

              const remoteEntry =
                await githubStorageProvider.makeGetRemoteFileEntryCb(
                  e.uid,
                  storageOpts,
                )();

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

        console.log({ result1: result });
        result = result.filter(
          (r) => r.result?.action === 'set' && r.result.target === 'fileB',
        );
        console.log({ result2: result });

        if (result.length === 0) {
          return;
        }

        const wsMetadata = storageOpts.readWorkspaceMetadata() as WsMetadata;

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
          await githubStorageProvider.fileEntryManager.updateFileSource(
            entryA.uid,
            entryA.file,
          );
        }
      };
      let prev: ReturnType<typeof setTimeout> | undefined;
      return {
        async deferredUpdate(store) {
          if (staredProcessing === false) {
            prev && clearTimeout(prev);
            prev = setTimeout(() => {
              staredProcessing = true;
              console.log('starting');
              exec(store).finally(() => {
                staredProcessing = false;
              });
            }, 100);
          }
        },
      };
    },
  });
}
