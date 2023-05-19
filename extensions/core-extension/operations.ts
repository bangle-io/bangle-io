import { editor, getNewStore, getOldStore, nsmApi2 } from '@bangle.io/api';
import {
  HELP_FS_WORKSPACE_NAME,
  NEW_NOTE_DIALOG_NAME,
  NEW_WORKSPACE_DIALOG_NAME,
  RENAME_NOTE_DIALOG_NAME,
  SEVERITY,
  WorkerErrorCode,
} from '@bangle.io/constants';
import type { ApplicationStore, AppState } from '@bangle.io/create-store';
import type { NsmStore } from '@bangle.io/shared-types';
import { uiSliceKey } from '@bangle.io/slice-ui';
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
      nsmApi2.ui.showNotification({
        severity: SEVERITY.ERROR,
        uid: 'new-note-not-no-workspace',
        title: 'Please first select a workspace',
        buttons: [],
      });

      return;
    }

    const abortController = new AbortController();
    nsmApi2.ui.showNotification({
      severity: SEVERITY.INFO,
      uid: 'downloading-ws-copy' + wsName,
      title: 'Hang tight! your backup zip will be downloaded momentarily.',
      buttons: [],
    });

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
      nsmApi2.ui.showNotification({
        buttons: [],
        severity: SEVERITY.ERROR,
        uid: 'restoreWorkspaceFromBackup-no-workspace',
        title: 'Please create an empty workspace first',
      });

      return false;
    }

    filePicker()
      .then((file) => {
        const abortController = new AbortController();

        nsmApi2.ui.showNotification({
          buttons: [],
          severity: SEVERITY.INFO,
          uid: 'restoreWorkspaceFromBackup-' + wsName,
          title:
            'Hang tight! Bangle is processing your notes. Please do not reload or close this tab.',
        });

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

          nsmApi2.ui.showNotification({
            buttons: [],
            severity: SEVERITY.SUCCESS,
            uid: 'recovery-finished-' + wsName,
            title: 'Your notes have successfully restored.',
          });
        },
        (error) => {
          // comlink is unable to understand custom errors
          if (
            error?.message?.includes(WorkerErrorCode.EMPTY_WORKSPACE_NEEDED)
          ) {
            nsmApi2.ui.showNotification({
              buttons: [],
              severity: SEVERITY.ERROR,
              uid: 'restoreWorkspaceFromBackup-workspace-has-things',
              title: 'This operation requires an empty workspace.',
            });

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
      nsmApi2.ui.showNotification({
        buttons: [],
        severity: SEVERITY.ERROR,
        uid: 'new-note-not-no-workspace',
        title: 'Please first select a workspace',
      });

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

export function renameActiveNote(store: ApplicationStore) {
  const nsmStore = getNewStore(store);
  const { state, dispatch } = store;
  const focusedWsPath = editor.getFocusedWsPath(nsmStore.state);

  if (!focusedWsPath) {
    nsmApi2.ui.showNotification({
      severity: SEVERITY.ERROR,
      uid: 'delete-wsPath-not-found',
      title: 'Cannot rename because there is no active note',
      buttons: [],
    });

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
}

export function deleteActiveNote(nsmStore: NsmStore) {
  const focusedWsPath = editor.getFocusedWsPath(nsmStore.state);

  const oldStore = getOldStore(nsmStore);
  const { state, dispatch } = oldStore;

  if (!focusedWsPath) {
    nsmApi2.ui.showNotification({
      severity: SEVERITY.ERROR,
      uid: 'delete-wsPath-not-found',
      title: 'Cannot delete because there is no active note',
      buttons: [],
    });

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
    deleteNote(focusedWsPath)(state, dispatch, oldStore)
      .then((error) => {
        nsmApi2.ui.showNotification({
          buttons: [],
          severity: SEVERITY.SUCCESS,
          uid: 'success-delete-' + focusedWsPath,
          title: 'Successfully deleted ' + focusedWsPath,
        });
      })
      .catch((error) => {
        nsmApi2.ui.showNotification({
          buttons: [],
          severity: SEVERITY.ERROR,
          uid: 'delete-' + deleteActiveNote,
          title: error.displayMessage || error.message,
        });
      });
  }

  return true;
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

export function removeWorkspace(wsName?: string) {
  return async (
    state: AppState,
    dispatch: ApplicationStore['dispatch'],
    store: ApplicationStore,
  ) => {
    wsName = wsName || workspaceSliceKey.getSliceState(state)?.wsName;

    if (!wsName) {
      nsmApi2.ui.showNotification({
        buttons: [],
        severity: SEVERITY.ERROR,
        uid: 'removeWorkspace-no-workspace',
        title: 'Please open a workspace first',
      });

      return;
    }

    if (wsName === HELP_FS_WORKSPACE_NAME) {
      nsmApi2.ui.showNotification({
        buttons: [],
        severity: SEVERITY.ERROR,
        uid: 'removeWorkspace-not-allowed',
        title: 'Cannot remove help workspace',
      });

      return;
    }

    if (
      window.confirm(
        `Are you sure you want to remove "${wsName}"? Removing a workspace does not delete any files inside it.`,
      )
    ) {
      await deleteWorkspace(wsName)(state, dispatch, store);

      nsmApi2.ui.showNotification({
        buttons: [],
        severity: SEVERITY.SUCCESS,
        uid: 'success-removed-' + wsName,
        title: 'Successfully removed ' + wsName,
      });
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
