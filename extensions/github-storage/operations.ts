import { ApplicationStore, AppState } from '@bangle.io/create-store';
import { LocalFileEntryManager } from '@bangle.io/remote-file-sync';
import { showNotification } from '@bangle.io/slice-notification';
import {
  getStorageProviderName,
  getStorageProviderOpts,
  refreshWsPaths,
  workspaceSliceKey,
} from '@bangle.io/slice-workspace';

import { GITHUB_STORAGE_PROVIDER_NAME } from './common';
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

export function isGithubStorageProvider() {
  return (state: AppState) => {
    const wsName = workspaceSliceKey.getSliceStateAsserted(state).wsName;

    if (!wsName) {
      return false;
    }

    return (
      getStorageProviderName(wsName)(state) === GITHUB_STORAGE_PROVIDER_NAME
    );
  };
}

export function pullGithubChanges(fileEntryManager: LocalFileEntryManager) {
  return (
    _: AppState,
    __: ApplicationStore['dispatch'],
    store: ApplicationStore,
  ) => {
    const wsName = workspaceSliceKey.getSliceStateAsserted(store.state).wsName;

    if (!wsName) {
      return false;
    }

    const storageOpts = getStorageProviderOpts()(store.state, store.dispatch);

    if (storageOpts.storageProviderName !== GITHUB_STORAGE_PROVIDER_NAME) {
      return false;
    }

    const wsMetadata = storageOpts.readWorkspaceMetadata() as GithubWsMetadata;

    // TODO: should we refresh data here or in the syncUntouchedEntries?
    GithubRepoTree.refreshCachedData(wsName, wsMetadata)
      .then(() => {
        return syncUntouchedEntries(
          new AbortController().signal,
          fileEntryManager,
          wsName,
          wsMetadata,
        );
      })
      .then(
        (result) => {
          showNotification({
            severity: 'info',
            title: `Synced ${result} entries`,
            uid: 'sync done ' + Math.random(),
          })(store.state, store.dispatch);
        },
        (error) => {
          showNotification({
            severity: 'error',
            title: 'Error syncing',
            content: error.message,
            uid: 'sync error ' + Math.random(),
          })(store.state, store.dispatch);
        },
      )
      .finally(() => {
        refreshWsPaths()(store.state, store.dispatch);
      });

    return true;
  };
}
