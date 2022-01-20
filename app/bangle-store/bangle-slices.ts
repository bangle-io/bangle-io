import { ApplicationStore, Slice } from '@bangle.io/create-store';
import { extensionRegistrySlice } from '@bangle.io/extension-registry';
import {
  EditorManagerAction,
  editorManagerSlice,
} from '@bangle.io/slice-editor-manager';
import { pageSlice, PageSliceAction } from '@bangle.io/slice-page';
import { UiContextAction, uiSlice } from '@bangle.io/slice-ui';
import type { WorkspaceSliceAction } from '@bangle.io/slice-workspace';
import { workspaceSlice } from '@bangle.io/slice-workspace';
import { workspacesSlice } from '@bangle.io/slice-workspaces-manager';
import { naukarProxySlice } from '@bangle.io/worker-naukar-proxy';
import { workerSetupSlices } from '@bangle.io/worker-setup';

import { e2eHelpers } from './e2e-helpers';
import { historySlice } from './slices/history-slice';
import { pageLifeCycleSlice } from './slices/page-lifecycle-slice';
import { saveStateSlice } from './slices/save-state-slice';

export type BangleActionTypes =
  | UiContextAction
  | PageSliceAction
  | EditorManagerAction
  | WorkspaceSliceAction;

export type BangleSliceTypes = ReturnType<typeof bangleStateSlices>;

export function bangleStateSlices({
  onUpdate,
  extensionSlices,
}: {
  onUpdate?: (store: ApplicationStore) => void;
  extensionSlices: Slice<any>[];
}) {
  const pageBlock = [pageSlice(), historySlice(), pageLifeCycleSlice()];

  return [
    ...pageBlock,
    naukarProxySlice(),
    ...workerSetupSlices(),
    workspacesSlice(),
    extensionRegistrySlice(),
    workspaceSlice(),
    uiSlice(),
    editorManagerSlice(),
    saveStateSlice(),
    ...extensionSlices,

    e2eHelpers(),
    // keep this at the end
    new Slice({
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
