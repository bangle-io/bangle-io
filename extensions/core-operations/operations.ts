import { WorkerErrorCode } from '@bangle.io/constants';
import { ApplicationStore, AppState } from '@bangle.io/create-store';
import {
  notificationSliceKey,
  showNotification,
} from '@bangle.io/slice-notification';
import {
  refreshWsPaths,
  WorkspaceSliceAction,
  workspaceSliceKey,
} from '@bangle.io/slice-workspace';
import { sleep } from '@bangle.io/utils';
import { naukarProxy } from '@bangle.io/worker-naukar-proxy';

export function downloadWorkspace() {
  return (
    state: AppState,
    dispatch: ApplicationStore<any, WorkspaceSliceAction>['dispatch'],
  ) => {
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
