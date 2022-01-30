import { ApplicationStore, Slice } from '@bangle.io/create-store';
import { extensionRegistrySlice } from '@bangle.io/extension-registry';
import {
  EditorManagerAction,
  editorManagerSlice,
} from '@bangle.io/slice-editor-manager';
import { notificationSlice } from '@bangle.io/slice-notification';
import { uncaughtExceptionNotification } from '@bangle.io/slice-notification';
import { pageSlice, PageSliceAction } from '@bangle.io/slice-page';
import { UiContextAction, uiSlice } from '@bangle.io/slice-ui';
import type { WorkspaceSliceAction } from '@bangle.io/slice-workspace';
import { workspaceSlice } from '@bangle.io/slice-workspace';
import { naukarProxySlice } from '@bangle.io/worker-naukar-proxy';
import { workerSetupSlices } from '@bangle.io/worker-setup';

import { e2eHelpers } from './e2e-helpers';
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

function disableSideEffect(slice: Slice<any>) {
  slice.spec.sideEffect = undefined;
  return slice;
}

export function bangleStateSlices({
  onUpdate,
  extensionSlices,
}: {
  onUpdate?: (store: ApplicationStore) => void;
  extensionSlices: Slice<any>[];
}) {
  const pageBlock = [
    disableSideEffect(pageSlice()),
    historySlice(),
    pageLifeCycleSlice(),
  ];
  return [
    ...pageBlock,
    naukarProxySlice(),
    ...workerSetupSlices(),
    disableSideEffect(workspaceSlice()),
    extensionRegistrySlice(),
    uiSlice(),
    editorManagerSlice(),
    saveStateSlice(),
    miscEffectsSlice(),
    notificationSlice(),

    ...extensionSlices,

    e2eHelpers(),
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
      sideEffect: [
        () => {
          return {
            deferredUpdate(store) {
              onUpdate?.(store);
            },
          };
        },
      ],
    }),
  ];
}
