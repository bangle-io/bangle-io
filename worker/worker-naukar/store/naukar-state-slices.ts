import { ApplicationStore, Slice } from '@bangle.io/create-store';
import { pageSlice } from '@bangle.io/slice-page';
import { workspaceSlice } from '@bangle.io/slice-workspace';
import { workspacesSlice } from '@bangle.io/slice-workspaces-manager';

import { editorManagerSlice } from '../slices/editor-manager-slice';
import { syncWithWindowSlices } from '../slices/sync-with-window-slices';

export type NaukarActionTypes = {
  name: string;
};
export type NaukarSliceTypes = ReturnType<typeof naukarStateSlices>;

export function naukarStateSlices({
  onUpdate,
}: {
  onUpdate?: (store: ApplicationStore) => void;
}) {
  return [
    ...syncWithWindowSlices(),
    pageSlice(),
    workspacesSlice(),
    workspaceSlice(),

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
