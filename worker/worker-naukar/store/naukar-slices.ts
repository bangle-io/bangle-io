// <-- PLOP INSERT SLICE IMPORT -->

import type { ApplicationStore } from '@bangle.io/create-store';
import { Slice } from '@bangle.io/create-store';
import { extensionRegistrySlice } from '@bangle.io/extension-registry';
import { editorSyncSlice } from '@bangle.io/slice-editor-collab-comms';
import { notificationSlice } from '@bangle.io/slice-notification';
import { pageSlice } from '@bangle.io/slice-page';
import { storageProviderSlice } from '@bangle.io/slice-storage-provider';
import { workspaceSlice } from '@bangle.io/slice-workspace';
import { workspaceOpenedDocInfoSlice } from '@bangle.io/slice-workspace-opened-doc-info';
import { workerEditorSlice } from '@bangle.io/worker-editor';

import { syncWithWindowSlices } from '../slices/sync-with-window-slices';

export type NaukarActionTypes = {
  name: string;
};
export type NaukarSliceTypes = ReturnType<typeof naukarSlices>;

export function naukarSlices({
  onUpdate,
}: {
  onUpdate?: (store: ApplicationStore) => void;
}) {
  // Order matters: any subsequent slice may depend on the previous slices
  return [
    ...syncWithWindowSlices(),
    extensionRegistrySlice(),
    // disabling side effects in worker because storage provider error handling
    // callback happens only in main. This is because we currently run extension
    // slices in main thread only. So the error is serialized in state, synced
    // with main and then storage provider callback is called in main's side effect.
    disableSideEffect(storageProviderSlice()),
    pageSlice(),
    workspaceSlice(),
    workerEditorSlice(),
    notificationSlice(),
    // TODO: write why this is disabled
    disableSideEffect(editorSyncSlice()),
    workspaceOpenedDocInfoSlice(),

    // <-- PLOP INSERT SLICE -->
    // keep this at the end
    new Slice({
      sideEffect() {
        return {
          deferredUpdate(store) {
            onUpdate?.(store);
          },
        };
      },
    }),
  ];
}

// disables side effects in worker because they will be handled by the main
function disableSideEffect(slice: Slice) {
  slice.spec.sideEffect = undefined;

  return slice;
}
