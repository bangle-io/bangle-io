import { WorkerErrorCode } from '@bangle.io/constants';
import { ApplicationStore, AppState } from '@bangle.io/create-store';
import { EditorIdType } from '@bangle.io/editor-manager-context';
import { naukarWorkerProxy } from '@bangle.io/naukar-proxy';
import { UiContextAction, UiContextDispatchType } from '@bangle.io/ui-context';
import { sleep } from '@bangle.io/utils';
import {
  deleteNote,
  refreshWsPaths,
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
        name: 'UI/SHOW_NOTIFICATION',
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
      name: 'UI/UPDATE_PALETTE',
      value: { type: null },
    });

    dispatch({
      name: 'UI/SHOW_MODAL',
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
        name: 'UI/SHOW_NOTIFICATION',
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
      name: 'UI/UPDATE_PALETTE',
      value: { type: null },
    });

    dispatch({
      name: 'UI/SHOW_MODAL',
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

    if (!workspaceSliceState) {
      return false;
    }

    const { primaryWsPath } = workspaceSliceState.openedWsPaths;

    if (!primaryWsPath) {
      dispatch({
        name: 'UI/SHOW_NOTIFICATION',
        value: {
          severity: 'error',
          uid: 'delete-wsPath-not-found',
          content: 'Cannot delete because there is no active note',
        },
      });
      return true;
    }

    dispatch({
      name: 'UI/UPDATE_PALETTE',
      value: { type: null },
    });

    if (
      typeof window !== 'undefined' &&
      window.confirm(
        `Are you sure you want to remove "${
          resolvePath(primaryWsPath).filePath
        }"? It cannot be undone.`,
      )
    ) {
      deleteNote(primaryWsPath)(state, dispatch, store)
        .then((error) => {
          dispatch({
            name: 'UI/SHOW_NOTIFICATION',
            value: {
              severity: 'success',
              uid: 'success-delete-' + primaryWsPath,
              content: 'Successfully deleted ' + primaryWsPath,
            },
          });
        })
        .catch((error) => {
          dispatch({
            name: 'UI/SHOW_NOTIFICATION',
            value: {
              severity: 'error',
              uid: 'delete-' + primaryWsPath,
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
      name: 'UI/SHOW_MODAL',
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

export function downloadWorkspace() {
  return (
    state: AppState,
    dispatch: ApplicationStore<
      any,
      WorkspaceSliceAction | UiContextAction
    >['dispatch'],
  ) => {
    const wsName = workspaceSliceKey.getSliceState(state)?.wsName;

    if (!wsName) {
      dispatch({
        name: 'UI/SHOW_NOTIFICATION',
        value: {
          severity: 'error',
          uid: 'new-note-not-no-workspace',
          content: 'Please first select a workspace',
        },
      });
      return;
    }

    const abortController = new AbortController();
    dispatch({
      name: 'UI/SHOW_NOTIFICATION',
      value: {
        severity: 'info',
        uid: 'downloading-ws-copy' + wsName,
        content: 'Hang tight! your backup zip will be downloaded momentarily.',
      },
    });

    naukarWorkerProxy
      .abortableBackupAllFiles(abortController.signal, wsName)
      .then((blob: File) => {
        downloadBlob(blob, blob.name);
      });

    return true;
  };
}

export function restoreWorkspaceFromBackup() {
  return (_: AppState, __: UiContextDispatchType, store: ApplicationStore) => {
    const wsName = workspaceSliceKey.getSliceState(store.state)?.wsName;

    if (!wsName) {
      store.dispatch({
        name: 'UI/SHOW_NOTIFICATION',
        value: {
          severity: 'error',
          uid: 'restoreWorkspaceFromBackup-no-workspace',
          content: 'Please create an empty workspace first',
        },
      });
      return false;
    }

    filePicker()
      .then((file) => {
        const abortController = new AbortController();
        store.dispatch({
          name: 'UI/SHOW_NOTIFICATION',
          value: {
            severity: 'info',
            uid: 'recovery-started-' + wsName,
            content:
              'Hang tight! Bangle is processing your notes. Please do not reload or close this tab.',
          },
        });

        return naukarWorkerProxy.abortableCreateWorkspaceFromBackup(
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
          store.dispatch({
            name: 'UI/SHOW_NOTIFICATION',
            value: {
              severity: 'success',
              uid: 'recovery-finished-' + wsName,
              content: 'Your notes have successfully restored.',
            },
          });
        },
        (error) => {
          // comlink is unable to understand custom errors
          if (
            error?.message?.includes(WorkerErrorCode.EMPTY_WORKSPACE_NEEDED)
          ) {
            store.dispatch({
              name: 'UI/SHOW_NOTIFICATION',
              value: {
                severity: 'error',
                uid: 'restoreWorkspaceFromBackup-workspace-has-things',
                content: 'This action requires an empty workspace.',
              },
            });
            return;
          }
        },
      );

    return true;
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
