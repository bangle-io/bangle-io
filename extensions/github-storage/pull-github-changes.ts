import { LocalFileEntryManager } from '@bangle.io/remote-file-sync';
import { isAbortError } from '@bangle.io/utils';

import { GithubRepoTree } from './github-repo-tree';
import { GithubWsMetadata } from './helpers';
import { syncUntouchedEntries } from './sync';

// export function syncGithubChanges() {
//   return (
//     _: AppState,
//     __: ApplicationStore['dispatch'],
//     store: ApplicationStore,
//   ) => {
//     const wsName = workspaceSliceKey.getSliceStateAsserted(store.state).wsName;

//     if (!wsName) {
//       return false;
//     }

//     const storageOpts = getStorageProviderOpts()(store.state, store.dispatch);

//     const storageProvider = getStorageProviderName(wsName)(store.state) as
//       | GithubStorageProvider
//       | undefined;

//     if (storageOpts.storageProviderName !== storageProvider?.name) {
//       return false;
//     }

//     pushModifiedOrCreatedEntries(
//       new AbortController().signal,
//       storageProvider.fileEntryManager,
//       wsName,
//       storageOpts.readWorkspaceMetadata() as WsMetadata,
//       (uid) => {
//         return storageProvider.makeGetRemoteFileEntryCb(uid, storageOpts)();
//       },
//     )
//       .then(
//         (result) => {
//           showNotification({
//             severity: 'info',
//             title: `Pushed ${result} entries`,
//             uid: 'push done ' + Math.random(),
//           })(store.state, store.dispatch);
//         },
//         (error) => {
//           showNotification({
//             severity: 'error',
//             title: 'Error pushing changes',
//             content: error.message,
//             uid: 'push error ' + Math.random(),
//           })(store.state, store.dispatch);
//         },
//       )
//       .then(() => {
//         syncUntouchedEntries(
//           new AbortController().signal,
//           storageProvider.fileEntryManager,
//           wsName,
//           (uid) => {
//             return storageProvider.makeGetRemoteFileEntryCb(uid, storageOpts)();
//           },
//         ).then(
//           (result) => {
//             showNotification({
//               severity: 'info',
//               title: `Pulled ${result} entries`,
//               uid: 'pull done ' + Math.random(),
//             })(store.state, store.dispatch);
//           },
//           (error) => {
//             showNotification({
//               severity: 'error',
//               title: 'Error pulling changes',
//               content: error.message,
//               uid: 'pull error ' + Math.random(),
//             })(store.state, store.dispatch);
//           },
//         );
//       });

//     return true;
//   };
// }

export async function pullGithubChanges(
  wsName: string,
  fileEntryManager: LocalFileEntryManager,
  wsMetadata: GithubWsMetadata,
  abortSignal: AbortSignal,
) {
  try {
    await GithubRepoTree.refreshCachedData(wsName, wsMetadata, abortSignal);
    const syncedEntries = await syncUntouchedEntries(
      abortSignal,
      fileEntryManager,
      wsName,
      wsMetadata,
    );
    return syncedEntries;
  } catch (error) {
    if (isAbortError(error)) {
      return undefined;
    }
    throw error;
  }
}
