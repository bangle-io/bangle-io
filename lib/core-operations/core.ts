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
import { resolvePath } from '@bangle.io/ws-path';

export function newNote(initialValue?: string) {
  return (state: AppState, dispatch: UiContextDispatchType) => {
    const wsName = workspaceSliceKey.getSliceState(state)?.wsName;

    if (!wsName) {
      dispatch({
        name: 'action::@bangle.io/ui-context:SHOW_NOTIFICATION',
        value: {
          severity: 'error',
          uid: 'new-note-not-no-workspace',
          content: 'Please first select a workspace',
        },
      });
      return;
    }

    // To avoid overlapping
    dispatch({
      name: 'action::@bangle.io/ui-context:UPDATE_PALETTE',
      value: { type: null },
    });

    dispatch({
      name: 'action::@bangle.io/ui-context:SHOW_MODAL',
      value: {
        modal: 'new-note',
        modalValue: {
          initialValue: initialValue,
        },
      },
    });
  };
}

export function renameNote() {
  return (state: AppState, dispatch: UiContextDispatchType): boolean => {
    const openedWsPaths = workspaceSliceKey.getSliceState(state)?.openedWsPaths;
    if (!openedWsPaths) {
      return false;
    }
    const { primaryWsPath } = openedWsPaths;

    if (!primaryWsPath) {
      dispatch({
        name: 'action::@bangle.io/ui-context:SHOW_NOTIFICATION',
        value: {
          severity: 'error',
          uid: 'rename-wsPath-not-found',
          content: 'Cannot rename because there is no active note',
        },
      });
      return true;
    }

    // To avoid overlapping
    dispatch({
      name: 'action::@bangle.io/ui-context:UPDATE_PALETTE',
      value: { type: null },
    });

    dispatch({
      name: 'action::@bangle.io/ui-context:SHOW_MODAL',
      value: {
        modal: 'rename-note',
      },
    });

    return true;
  };
}

export function deleteActiveNote() {
  return (
    state: AppState,
    dispatch: ApplicationStore<
      any,
      WorkspaceSliceAction | UiContextAction
    >['dispatch'],
    store: ApplicationStore,
  ): boolean => {
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

    if (!focusedWsPath) {
      dispatch({
        name: 'action::@bangle.io/ui-context:SHOW_NOTIFICATION',
        value: {
          severity: 'error',
          uid: 'delete-wsPath-not-found',
          content: 'Cannot delete because there is no active note',
        },
      });
      return true;
    }

    dispatch({
      name: 'action::@bangle.io/ui-context:UPDATE_PALETTE',
      value: { type: null },
    });

    if (
      typeof window !== 'undefined' &&
      window.confirm(
        `Are you sure you want to remove "${
          resolvePath(focusedWsPath).filePath
        }"? It cannot be undone.`,
      )
    ) {
      deleteNote(focusedWsPath)(state, dispatch, store)
        .then((error) => {
          dispatch({
            name: 'action::@bangle.io/ui-context:SHOW_NOTIFICATION',
            value: {
              severity: 'success',
              uid: 'success-delete-' + focusedWsPath,
              content: 'Successfully deleted ' + focusedWsPath,
            },
          });
        })
        .catch((error) => {
          dispatch({
            name: 'action::@bangle.io/ui-context:SHOW_NOTIFICATION',
            value: {
              severity: 'error',
              uid: 'delete-' + deleteActiveNote,
              content: error.displayMessage || error.message,
            },
          });
        });
    }
    return true;
  };
}

export function newWorkspace() {
  return (state: AppState, dispatch: UiContextDispatchType) => {
    dispatch({
      name: 'action::@bangle.io/ui-context:SHOW_MODAL',
      value: { modal: '@modal/new-workspace' },
    });
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
