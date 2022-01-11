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
import {
  deleteWorkspace as _deletedWorkspace,
  HELP_FS_WORKSPACE_NAME,
} from '@bangle.io/workspaces';
import { getFocusedWsPath } from './core';

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

export function renameActiveNote() {
  return (state: AppState, dispatch: UiContextDispatchType): boolean => {
    const focusedWsPath = getFocusedWsPath()(state);

    if (!focusedWsPath) {
      dispatch({
        name: 'action::@bangle.io/ui-context:SHOW_NOTIFICATION',
        value: {
          severity: 'error',
          uid: 'delete-wsPath-not-found',
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
    const focusedWsPath = getFocusedWsPath()(state);

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

export function removeWorkspace(wsName?: string) {
  return async (
    state: AppState,
    dispatch: ApplicationStore['dispatch'],
    store: ApplicationStore,
  ) => {
    wsName = wsName || workspaceSliceKey.getSliceState(state)?.wsName;

    if (!wsName) {
      dispatch({
        name: 'action::@bangle.io/ui-context:SHOW_NOTIFICATION',
        value: {
          severity: 'error',
          uid: 'removeWorkspace-no-workspace',
          content: 'Please open a workspace first',
        },
      });
      return;
    }

    if (wsName === HELP_FS_WORKSPACE_NAME) {
      dispatch({
        name: 'action::@bangle.io/ui-context:SHOW_NOTIFICATION',
        value: {
          severity: 'error',
          uid: 'removeWorkspace-not-allowed',
          content: 'Cannot remove help workspace',
        },
      });
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to remove "${wsName}"? Removing a workspace does not delete any files inside it.`,
      )
    ) {
      await _deletedWorkspace(wsName)(state, dispatch, store);
    }
  };
}
