import { PageSliceAction } from '@bangle.io/constants';
import { ApplicationStore, Slice } from '@bangle.io/create-store';
import {
  EditorManagerAction,
  editorManagerSlice,
} from '@bangle.io/editor-manager-context';
import { UiContextAction, uiSlice } from '@bangle.io/ui-context';
import { workerSlice } from '@bangle.io/worker-setup';

import { pageSlice } from './page-slice';

export type BangleActionTypes =
  | UiContextAction
  | PageSliceAction
  | EditorManagerAction;

export type BangleSliceTypes = ReturnType<typeof bangleStateSlices>;

export function bangleStateSlices({
  onUpdate,
}: {
  onUpdate?: (store: ApplicationStore) => void;
}) {
  return [
    workerSlice(),
    pageSlice(),
    uiSlice(),
    editorManagerSlice(),

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
