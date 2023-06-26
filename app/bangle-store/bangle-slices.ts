// <-- PLOP INSERT SLICE IMPORT -->
import type { ApplicationStore } from '@bangle.io/create-store';
import { Slice } from '@bangle.io/create-store';
import { extensionRegistrySlice } from '@bangle.io/extension-registry';
import { pageSlice } from '@bangle.io/slice-page';
import { storageProviderSlice } from '@bangle.io/slice-storage-provider';
import { workspaceSlice } from '@bangle.io/slice-workspace';

import { historySlice } from './slices/history-slice';
import { pageLifeCycleSlice } from './slices/page-lifecycle-slice';

export type BangleSliceTypes = ReturnType<typeof bangleStateSlices>;

// disables side effects in main because they will be handled by the worker
function disableSideEffect(slice: Slice) {
  slice.spec.sideEffect = undefined;

  return slice;
}

export function bangleStateSlices({
  onUpdate,
  extensionSlices,
}: {
  onUpdate?: (store: ApplicationStore) => void;
  extensionSlices: Slice[];
}) {
  const pageBlock = [
    disableSideEffect(pageSlice()),
    historySlice(),
    pageLifeCycleSlice(),
  ];

  // Order matters: any subsequent slice may depend on the previous slices
  return [
    ...pageBlock,
    extensionRegistrySlice(),
    storageProviderSlice(),
    disableSideEffect(workspaceSlice()),
    // uiSlice(),
    // saveStateSlice(),

    // <-- PLOP INSERT SLICE -->
    ...extensionSlices,

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
