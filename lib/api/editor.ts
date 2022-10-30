import type { AppState } from '@bangle.io/create-store';
import { editorManagerSliceKey } from '@bangle.io/slice-editor-manager';
import { workspaceSliceKey } from '@bangle.io/slice-workspace';

export {
  blurEditor,
  focusPrimaryEditor,
  forEachEditor,
} from '@bangle.io/slice-editor-manager';

export function getFocusedWsPath() {
  return (state: AppState) => {
    const workspaceSliceState = workspaceSliceKey.getSliceState(state);
    const editorSliceState = editorManagerSliceKey.getSliceState(state);

    if (!workspaceSliceState || !editorSliceState) {
      return false;
    }

    const { focusedEditorId } = editorSliceState;
    const { openedWsPaths } = workspaceSliceState;

    if (focusedEditorId == null) {
      return false;
    }
    const focusedWsPath = openedWsPaths.getByIndex(focusedEditorId);

    return focusedWsPath;
  };
}
