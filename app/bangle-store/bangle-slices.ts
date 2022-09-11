// <-- PLOP INSERT SLICE IMPORT -->
import type { ApplicationStore } from '@bangle.io/create-store';
import { Slice } from '@bangle.io/create-store';
import { extensionRegistrySlice } from '@bangle.io/extension-registry';
import { editorSyncSlice } from '@bangle.io/slice-editor-collab-comms';
import type { EditorManagerAction } from '@bangle.io/slice-editor-manager';
import { editorManagerSlice } from '@bangle.io/slice-editor-manager';
import {
  notificationSlice,
  uncaughtExceptionNotification,
} from '@bangle.io/slice-notification';
import type { PageSliceAction } from '@bangle.io/slice-page';
import { pageSlice } from '@bangle.io/slice-page';
import { storageProviderSlice } from '@bangle.io/slice-storage-provider';
import type { UiContextAction } from '@bangle.io/slice-ui';
import { uiSlice } from '@bangle.io/slice-ui';
import type { WorkspaceSliceAction } from '@bangle.io/slice-workspace';
import { workspaceSlice } from '@bangle.io/slice-workspace';
import { workspaceOpenedDocInfoSlice } from '@bangle.io/slice-workspace-opened-doc-info';
import { naukarProxySlice } from '@bangle.io/worker-naukar-proxy';
import { workerSetupSlices } from '@bangle.io/worker-setup';

import { e2eHelpers, e2eHelpers2 } from './e2e-helpers';
import { historySlice } from './slices/history-slice';
import { miscEffectsSlice } from './slices/misc-effects-slice';
import { pageLifeCycleSlice } from './slices/page-lifecycle-slice';
import { saveStateSlice } from './slices/save-state-slice';

export type BangleActionTypes =
  | UiContextAction
  | PageSliceAction
  | EditorManagerAction
  | WorkspaceSliceAction;

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
    ...workerSetupSlices(),
    naukarProxySlice(),
    ...pageBlock,
    extensionRegistrySlice(),
    storageProviderSlice(),
    disableSideEffect(workspaceSlice()),
    uiSlice(),
    editorManagerSlice(),
    saveStateSlice(),
    miscEffectsSlice(),
    notificationSlice(),
    editorSyncSlice(),
    // Disabled side effects in main because it carries heavy sha calculations
    disableSideEffect(workspaceOpenedDocInfoSlice()),

    // <-- PLOP INSERT SLICE -->

    ...extensionSlices,

    e2eHelpers(),
    e2eHelpers2(),
    // keep this at the end
    new Slice({
      onError(error, store) {
        (window as any).Sentry?.captureException(error);
        console.error(error);
        Promise.resolve().then(() => {
          uncaughtExceptionNotification(error)(store.state, store.dispatch);
        });

        return true;
      },
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
