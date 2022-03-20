import {
  CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE,
  CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE,
  HELP_FS_WORKSPACE_NAME,
  WorkspaceTypeBrowser,
  WorkspaceTypeNative,
} from '@bangle.io/constants';
import { ApplicationStore, AppState } from '@bangle.io/create-store';
import {
  notificationSliceKey,
  showNotification,
} from '@bangle.io/slice-notification';
import {
  UiContextAction,
  UiContextDispatchType,
  uiSliceKey,
} from '@bangle.io/slice-ui';
import {
  createWorkspace,
  deleteNote,
  deleteWorkspace as _deletedWorkspace,
  WorkspaceSliceAction,
  workspaceSliceKey,
} from '@bangle.io/slice-workspace';
import { resolvePath } from '@bangle.io/ws-path';

import { getFocusedWsPath } from './editor';

export function getWorkspaceState() {
  return (state: AppState) => workspaceSliceKey.getSliceStateAsserted(state);
}

export function newNote(initialValue?: string) {
  return uiSliceKey.op((state, dispatch) => {
    const wsName = workspaceSliceKey.getSliceState(state)?.wsName;

    if (!wsName) {
      showNotification({
        severity: 'error',
        uid: 'new-note-not-no-workspace',
        title: 'Please first select a workspace',
      })(
        notificationSliceKey.getState(state),
        notificationSliceKey.getDispatch(dispatch),
      );

      return;
    }

    // To avoid overlapping
    dispatch({
      name: 'action::@bangle.io/slice-ui:UPDATE_PALETTE',
      value: { type: null },
    });

    dispatch({
      name: 'action::@bangle.io/slice-ui:SHOW_DIALOG',
      value: {
        dialogName: 'dialog::@bangle.io/core-extension:new-note-modal',
        metadata: {
          initialValue: initialValue,
        },
      },
    });
  });
}

export function renameActiveNote() {
  return (state: AppState, dispatch: UiContextDispatchType): boolean => {
    const focusedWsPath = getFocusedWsPath()(state);

    if (!focusedWsPath) {
      showNotification({
        severity: 'error',
        uid: 'delete-wsPath-not-found',
        title: 'Cannot rename because there is no active note',
      })(
        notificationSliceKey.getState(state),
        notificationSliceKey.getDispatch(dispatch),
      );

      return true;
    }

    // To avoid overlapping
    dispatch({
      name: 'action::@bangle.io/slice-ui:UPDATE_PALETTE',
      value: { type: null },
    });

    dispatch({
      name: 'action::@bangle.io/slice-ui:SHOW_DIALOG',
      value: {
        dialogName: 'dialog::@bangle.io/core-extension:rename-note-modal',
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
      showNotification({
        severity: 'error',
        uid: 'delete-wsPath-not-found',
        title: 'Cannot delete because there is no active note',
      })(
        notificationSliceKey.getState(state),
        notificationSliceKey.getDispatch(dispatch),
      );

      return true;
    }

    dispatch({
      name: 'action::@bangle.io/slice-ui:UPDATE_PALETTE',
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
          showNotification({
            severity: 'success',
            uid: 'success-delete-' + focusedWsPath,
            title: 'Successfully deleted ' + focusedWsPath,
          })(
            notificationSliceKey.getState(state),
            notificationSliceKey.getDispatch(dispatch),
          );
        })
        .catch((error) => {
          showNotification({
            severity: 'error',
            uid: 'delete-' + deleteActiveNote,
            title: error.displayMessage || error.message,
          })(
            notificationSliceKey.getState(state),
            notificationSliceKey.getDispatch(dispatch),
          );
        });
    }

    return true;
  };
}

export function newWorkspace() {
  return (state: AppState, dispatch: UiContextDispatchType) => {
    dispatch({
      name: 'action::@bangle.io/slice-ui:SHOW_DIALOG',
      value: {
        dialogName: 'dialog::@bangle.io/core-extension:new-workspace-dialog',
      },
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
      showNotification({
        severity: 'error',
        uid: 'removeWorkspace-no-workspace',
        title: 'Please open a workspace first',
      })(
        notificationSliceKey.getState(state),
        notificationSliceKey.getDispatch(dispatch),
      );

      return;
    }

    if (wsName === HELP_FS_WORKSPACE_NAME) {
      showNotification({
        severity: 'error',
        uid: 'removeWorkspace-not-allowed',
        title: 'Cannot remove help workspace',
      })(
        notificationSliceKey.getState(state),
        notificationSliceKey.getDispatch(dispatch),
      );

      return;
    }

    if (
      window.confirm(
        `Are you sure you want to remove "${wsName}"? Removing a workspace does not delete any files inside it.`,
      )
    ) {
      await _deletedWorkspace(wsName)(state, dispatch, store);

      showNotification({
        severity: 'success',
        uid: 'success-removed-' + wsName,
        title: 'Successfully removed ' + wsName,
      })(
        notificationSliceKey.getState(state),
        notificationSliceKey.getDispatch(dispatch),
      );
    }
  };
}

export function createBrowserWorkspace(wsName: string) {
  return async (
    state: AppState,
    dispatch: ApplicationStore<
      any,
      WorkspaceSliceAction | UiContextAction
    >['dispatch'],
    store: ApplicationStore,
  ) => {
    if (typeof wsName !== 'string') {
      throw new Error(
        'Incorrect parameters for ' + CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE,
      );
    }

    try {
      await createWorkspace(wsName, WorkspaceTypeBrowser, {})(
        state,
        dispatch,
        store,
      );
      (window as any).fathom?.trackGoal('AISLCLRF', 0);
    } catch (error: any) {
      showNotification({
        severity: 'error',
        uid: 'error-create-workspace-' + wsName,
        title: 'Unable to create workspace ' + wsName,
        content: error.displayMessage || error.message,
      })(
        notificationSliceKey.getState(state),
        notificationSliceKey.getDispatch(dispatch),
      );
      throw error;
    }

    return true;
  };
}

export function createNativeFsWorkpsace(rootDirHandle: any) {
  return async (
    state: AppState,
    dispatch: ApplicationStore<
      any,
      WorkspaceSliceAction | UiContextAction
    >['dispatch'],
    store: ApplicationStore,
  ) => {
    if (typeof rootDirHandle?.name === 'string') {
      try {
        await createWorkspace(rootDirHandle.name, WorkspaceTypeNative, {
          rootDirHandle,
        })(state, dispatch, store);

        (window as any).fathom?.trackGoal('K3NFTGWX', 0);
      } catch (error: any) {
        showNotification({
          severity: 'error',
          uid: 'error-create-workspace-' + rootDirHandle?.name,
          title: 'Unable to create workspace ' + rootDirHandle?.name,
          content: error.displayMessage || error.message,
        })(
          notificationSliceKey.getState(state),
          notificationSliceKey.getDispatch(dispatch),
        );

        throw error;
      }
    } else {
      throw new Error(
        'Incorrect parameters for ' +
          CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE,
      );
    }

    return true;
  };
}
