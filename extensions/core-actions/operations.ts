import { WorkerErrorCode } from '@bangle.io/constants';
import { ApplicationStore, AppState } from '@bangle.io/create-store';
import { naukarWorkerProxy } from '@bangle.io/naukar-proxy';
import { UiContextAction, UiContextDispatchType } from '@bangle.io/ui-context';
import { sleep } from '@bangle.io/utils';
import {
  refreshWsPaths,
  WorkspaceSliceAction,
  workspaceSliceKey,
} from '@bangle.io/workspace-context';

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
        name: 'action::@bangle.io/ui-context:SHOW_NOTIFICATION',
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
      name: 'action::@bangle.io/ui-context:SHOW_NOTIFICATION',
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
  };
}

export function restoreWorkspaceFromBackup() {
  return (_: AppState, __: UiContextDispatchType, store: ApplicationStore) => {
    const wsName = workspaceSliceKey.getSliceState(store.state)?.wsName;

    if (!wsName) {
      store.dispatch({
        name: 'action::@bangle.io/ui-context:SHOW_NOTIFICATION',
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
          name: 'action::@bangle.io/ui-context:SHOW_NOTIFICATION',
          value: {
            severity: 'info',
            uid: 'restoreWorkspaceFromBackup-' + wsName,
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
            name: 'action::@bangle.io/ui-context:SHOW_NOTIFICATION',
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
              name: 'action::@bangle.io/ui-context:SHOW_NOTIFICATION',
              value: {
                severity: 'error',
                uid: 'restoreWorkspaceFromBackup-workspace-has-things',
                content: 'This operation requires an empty workspace.',
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
