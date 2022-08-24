// <-- PLOP INSERT SLICE IMPORT -->
import * as Sentry from '@sentry/browser';

import type { ApplicationStore } from '@bangle.io/create-store';
import { Slice } from '@bangle.io/create-store';
import { extensionRegistrySlice } from '@bangle.io/extension-registry';
import { editorSyncSlice } from '@bangle.io/slice-editor-sync';
import {
  notificationSlice,
  uncaughtExceptionNotification,
} from '@bangle.io/slice-notification';
import { pageSlice } from '@bangle.io/slice-page';
import { workspaceSlice } from '@bangle.io/slice-workspace';
import { workspaceOpenedDocInfoSlice } from '@bangle.io/slice-workspace-opened-doc-info';
import {
  workerEditorSlice,
  writeNoteToDiskSlice,
} from '@bangle.io/worker-editor';

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
  return [
    ...syncWithWindowSlices(),
    extensionRegistrySlice(),
    pageSlice(),
    workspaceSlice(),
    workerEditorSlice(),
    notificationSlice(),
    writeNoteToDiskSlice(),
    disableSideEffect(editorSyncSlice()),
    disableSideEffect(workspaceOpenedDocInfoSlice()),

    // <-- PLOP INSERT SLICE -->
    // keep this at the end
    new Slice({
      onError(error, store) {
        Sentry.captureException(error);
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

// disables side effects in worker because they will be handled by the main
function disableSideEffect(slice: Slice) {
  slice.spec.sideEffect = undefined;

  return slice;
}
