import { wsPathHelpers } from '@bangle.io/api';
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
//     const wsName = workspace.workspaceSliceKey.getSliceStateAsserted(store.state).wsName;

//     if (!wsName) {
//       return false;
//     }

//     const storageOpts = workspace.getStorageProviderOpts()(store.state, store.dispatch);

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
//           notification.showNotification({
//             severity: 'info',
//             title: `Pushed ${result} entries`,
//             uid: 'push done ' + Math.random(),
//           })(store.state, store.dispatch);
//         },
//         (error) => {
//           notification.showNotification({
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
//             notification.showNotification({
//               severity: 'info',
//               title: `Pulled ${result} entries`,
//               uid: 'pull done ' + Math.random(),
//             })(store.state, store.dispatch);
//           },
//           (error) => {
//             notification.showNotification({
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
    const synced = await syncUntouchedEntries(
      abortSignal,
      fileEntryManager,
      wsName,
      wsMetadata,
    );

    return synced;
  } catch (error) {
    if (isAbortError(error)) {
      return {
        updatedWsPaths: [],
        deletedWsPaths: [],
      };
    }
    throw error;
  }
}

export function needsEditorReset({
  openedWsPaths,
  updatedWsPaths,
  deletedWsPaths,
}: {
  openedWsPaths: wsPathHelpers.OpenedWsPaths;
  updatedWsPaths: string[];
  deletedWsPaths: string[];
}) {
  return (
    updatedWsPaths.some((path) => openedWsPaths.has(path)) ||
    deletedWsPaths.some((path) => openedWsPaths.has(path))
  );
}
