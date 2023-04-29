import { nsmSliceWorkspace } from '@bangle.io/nsm-slice-workspace';
import type { NsmStoreState } from '@bangle.io/shared-types';
import { nsmEditorManagerSlice } from '@bangle.io/slice-editor-manager';

export {
  forEachEditor,
  nsmEditorManagerSlice,
} from '@bangle.io/slice-editor-manager';

export function getFocusedWsPath(state: NsmStoreState) {
  const { openedWsPaths } = nsmSliceWorkspace.getState(state);
  const { focusedEditorId } = nsmEditorManagerSlice.getState(state);

  if (focusedEditorId == null) {
    return false;
  }

  const focusedWsPath = openedWsPaths.getByIndex(focusedEditorId);

  return focusedWsPath;
}
