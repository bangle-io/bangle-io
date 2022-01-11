import { ApplicationStore, AppState } from '@bangle.io/create-store';
import {
  EditorIdType,
  editorManagerSliceKey,
} from '@bangle.io/editor-manager-context';
import { UiContextAction, UiContextDispatchType } from '@bangle.io/ui-context';
import {
  deleteNote,
  updateOpenedWsPaths,
  WorkspaceDispatchType,
  WorkspaceSliceAction,
  workspaceSliceKey,
} from '@bangle.io/workspace-context';
import { deleteWorkspace, HELP_FS_WORKSPACE_NAME } from '@bangle.io/workspaces';
import { resolvePath } from '@bangle.io/ws-path';

export function getFocusedWsPath() {
  return (state: AppState) => {
    const workspaceSliceState = workspaceSliceKey.getSliceState(state);
    const editorSliceState = editorManagerSliceKey.getSliceState(state);

    if (!workspaceSliceState || !editorSliceState) {
      return false;
    }

    const { focusedEditorId } = editorSliceState;
    const { openedWsPaths } = workspaceSliceState;

    const focusedWsPath =
      typeof focusedEditorId === 'number' &&
      openedWsPaths.getByIndex(focusedEditorId);

    return focusedWsPath;
  };
}

export function splitEditor() {
  return (state: AppState, dispatch: WorkspaceDispatchType): boolean => {
    const workspaceSliceState = workspaceSliceKey.getSliceState(state);

    if (!workspaceSliceState) {
      return false;
    }

    const { primaryWsPath, secondaryWsPath } =
      workspaceSliceState.openedWsPaths;

    if (secondaryWsPath) {
      updateOpenedWsPaths((openedWsPath) =>
        openedWsPath.updateSecondaryWsPath(undefined),
      )(state, dispatch);
    } else if (primaryWsPath) {
      updateOpenedWsPaths((openedWsPath) =>
        openedWsPath.updateSecondaryWsPath(primaryWsPath),
      )(state, dispatch);
    }

    return true;
  };
}

export function closeEditor(editorId: EditorIdType) {
  return (state: AppState, dispatch: WorkspaceDispatchType): boolean => {
    if (typeof editorId === 'number') {
      updateOpenedWsPaths((openedWsPaths) =>
        openedWsPaths.updateByIndex(editorId, undefined).shrink(),
      )(state, dispatch);
    } else {
      updateOpenedWsPaths((openedWsPaths) => openedWsPaths.closeAll())(
        state,
        dispatch,
      );
    }

    return true;
  };
}
