import type { BangleAppDispatch } from '@bangle.io/api';
import { editor } from '@bangle.io/api';
import {
  HELP_FS_WORKSPACE_NAME,
  NEW_NOTE_DIALOG_NAME,
  NEW_WORKSPACE_DIALOG_NAME,
  RENAME_NOTE_DIALOG_NAME,
  WorkerErrorCode,
} from '@bangle.io/constants';
import type { ApplicationStore, AppState } from '@bangle.io/create-store';
import {
  notificationSliceKey,
  showNotification,
} from '@bangle.io/slice-notification';
import { uiSliceKey } from '@bangle.io/slice-ui';
import type { WorkspaceDispatchType } from '@bangle.io/slice-workspace';
import {
  deleteNote,
  deleteWorkspace,
  refreshWsPaths,
  updateOpenedWsPaths,
  workspaceSliceKey,
} from '@bangle.io/slice-workspace';
import { sleep } from '@bangle.io/utils';
import { naukarProxy } from '@bangle.io/worker-naukar-proxy';
import { resolvePath } from '@bangle.io/ws-path';

export function downloadWorkspace() {
  return (state: AppState, dispatch: ApplicationStore['dispatch']) => {
    const wsName = workspaceSliceKey.getSliceState(state)?.wsName;

    if (!wsName) {
      showNotification({
        severity: 'error',
        uid: 'new-note-not-no-workspace',
        title: 'Please first select a workspace',
      })(state, notificationSliceKey.getDispatch(dispatch));

      return;
    }

    const abortController = new AbortController();
    showNotification({
      severity: 'info',
      uid: 'downloading-ws-copy' + wsName,
      title: 'Hang tight! your backup zip will be downloaded momentarily.',
    })(state, notificationSliceKey.getDispatch(dispatch));

    naukarProxy
      .abortableBackupAllFiles(abortController.signal, wsName)
      .then((blob: File) => {
        downloadBlob(blob, blob.name);
      });
  };
}

export function restoreWorkspaceFromBackup() {
  return workspaceSliceKey.asyncOp(async (_, __, store) => {
    const wsName = workspaceSliceKey.getSliceState(store.state)?.wsName;

    if (!wsName) {
      showNotification({
        severity: 'error',
        uid: 'restoreWorkspaceFromBackup-no-workspace',
        title: 'Please create an empty workspace first',
      })(
        notificationSliceKey.getState(store.state),
        notificationSliceKey.getDispatch(store.dispatch),
      );

      return false;
    }

    filePicker()
      .then((file) => {
        const abortController = new AbortController();

        showNotification({
          severity: 'info',
          uid: 'restoreWorkspaceFromBackup-' + wsName,
          title:
            'Hang tight! Bangle is processing your notes. Please do not reload or close this tab.',
        })(
          notificationSliceKey.getState(store.state),
          notificationSliceKey.getDispatch(store.dispatch),
        );

        return naukarProxy.abortableCreateWorkspaceFromBackup(
          abortController.signal,
          wsName,
          file,
        );
      })
      .then(() => {
        return sleep(100);
      })
      .then(
        () => {
          refreshWsPaths()(store.state, store.dispatch);

          showNotification({
            severity: 'success',
            uid: 'recovery-finished-' + wsName,
            title: 'Your notes have successfully restored.',
          })(
            notificationSliceKey.getState(store.state),
            notificationSliceKey.getDispatch(store.dispatch),
          );
        },
        (error) => {
          // comlink is unable to understand custom errors
          if (
            error?.message?.includes(WorkerErrorCode.EMPTY_WORKSPACE_NEEDED)
          ) {
            showNotification({
              severity: 'error',
              uid: 'restoreWorkspaceFromBackup-workspace-has-things',
              title: 'This operation requires an empty workspace.',
            })(
              notificationSliceKey.getState(store.state),
              notificationSliceKey.getDispatch(store.dispatch),
            );

            return;
          }
        },
      );

    return true;
  });
}

export function openNewNoteDialog(initialValue?: string) {
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

    dispatch({
      name: 'action::@bangle.io/slice-ui:SHOW_DIALOG',
      value: {
        dialogName: NEW_NOTE_DIALOG_NAME,
        metadata: {
          initialValue: initialValue,
        },
      },
    });
  });
}

export function renameActiveNote() {
  return (state: AppState, dispatch: BangleAppDispatch): boolean => {
    const focusedWsPath = editor.getFocusedWsPath()(state);

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
        dialogName: RENAME_NOTE_DIALOG_NAME,
      },
    });

    return true;
  };
}

export function deleteActiveNote() {
  return (
    state: AppState,
    dispatch: ApplicationStore['dispatch'],
    store: ApplicationStore,
  ): boolean => {
    const focusedWsPath = editor.getFocusedWsPath()(state);

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

export function openNewWorkspaceDialog() {
  return uiSliceKey.op((state, dispatch) => {
    dispatch({
      name: 'action::@bangle.io/slice-ui:SHOW_DIALOG',
      value: {
        dialogName: NEW_WORKSPACE_DIALOG_NAME,
      },
    });
  });
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

export function openMiniEditor() {
  return (state: AppState, dispatch: WorkspaceDispatchType): boolean => {
    const workspaceSliceState = workspaceSliceKey.getSliceStateAsserted(state);

    const targetWsPath =
      editor.getFocusedWsPath()(state) ||
      workspaceSliceState.openedWsPaths.primaryWsPath;

    if (targetWsPath) {
      updateOpenedWsPaths((openedWsPath) =>
        openedWsPath.updateMiniEditorWsPath(targetWsPath),
      )(state, dispatch);

      return true;
    }

    return false;
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
      await deleteWorkspace(wsName)(state, dispatch, store);

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

function filePicker(): Promise<File> {
  return new Promise((res, rej) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';

    input.addEventListener(
      'change',
      () => {
        const file = input.files?.[0];

        if (file) {
          res(file);
        } else {
          rej(new Error('Unable to pick backup file'));
        }
      },
      { once: true },
    );
    input.click();
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.addEventListener(
    'click',
    () => {
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 150);
    },
    { once: true },
  );

  a.click();
}
