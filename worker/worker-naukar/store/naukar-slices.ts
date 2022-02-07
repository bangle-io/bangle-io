import * as Sentry from '@sentry/browser';

import { ApplicationStore, Slice } from '@bangle.io/create-store';
import { extensionRegistrySlice } from '@bangle.io/extension-registry';
import {
  notificationSlice,
  uncaughtExceptionNotification,
} from '@bangle.io/slice-notification';
import { pageSlice } from '@bangle.io/slice-page';
import { workspaceSlice } from '@bangle.io/slice-workspace';

import { syncWithWindowSlices } from '../slices/sync-with-window-slices';
import { editorManagerSlice } from '../slices/worker-editor-slice';

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
    editorManagerSlice(),
    notificationSlice(),

    // keep this at the end
    new Slice({
      onError(error, store) {
        Sentry?.captureException(error);
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
