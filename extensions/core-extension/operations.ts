import { internalApi, nsmApi2 } from '@bangle.io/api';
import {
  HELP_FS_WORKSPACE_NAME,
  SEVERITY,
  WorkerErrorCode,
} from '@bangle.io/constants';
import type { WsName } from '@bangle.io/shared-types';
import { sleep } from '@bangle.io/utils';
import { naukarProxy } from '@bangle.io/worker-naukar-proxy';
import { resolvePath2 } from '@bangle.io/ws-path';

export function downloadWorkspace() {
  const { wsName } = nsmApi2.workspace.workspaceState();

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

  naukarProxy.abortable
    .abortableBackupAllFiles(abortController.signal, wsName)
    .then((blob: File) => {
      downloadBlob(blob, blob.name);
    });
}

export function restoreWorkspaceFromBackup() {
  const { wsName } = nsmApi2.workspace.workspaceState();

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

      return naukarProxy.abortable.abortableCreateWorkspaceFromBackup(
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
        nsmApi2.workspace.refresh();

        nsmApi2.ui.showNotification({
          buttons: [],
          severity: SEVERITY.SUCCESS,
          uid: 'recovery-finished-' + wsName,
          title: `Restore success! ${
            nsmApi2.workspace.workspaceState().noteWsPaths?.length || 0
          } notes were restored.`,
        });
      },
      (error) => {
        // comlink is unable to understand custom errors
        if (error?.message?.includes(WorkerErrorCode.EMPTY_WORKSPACE_NEEDED)) {
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
}

export function deleteActiveNote() {
  const focusedWsPath = nsmApi2.editor.getFocusedWsPath();

  if (!focusedWsPath) {
    nsmApi2.ui.showNotification({
      severity: SEVERITY.ERROR,
      uid: 'delete-wsPath-not-found',
      title: 'Cannot delete because there is no primary note',
      buttons: [],
    });

    return true;
  }

  nsmApi2.ui.updatePalette(undefined);

  if (
    typeof window !== 'undefined' &&
    window.confirm(
      `Are you sure you want to remove "${
        resolvePath2(focusedWsPath).filePath
      }"? It cannot be undone.`,
    )
  ) {
    nsmApi2.workspace
      .deleteNote(focusedWsPath)
      .then(() => {
        nsmApi2.ui.showNotification({
          buttons: [],
          severity: SEVERITY.SUCCESS,
          uid: 'success-delete-' + focusedWsPath,
          title: 'Successfully deleted ' + focusedWsPath,
        });
      })
      .catch((error: unknown) => {
        if (error instanceof Error) {
          nsmApi2.ui.showNotification({
            buttons: [],
            severity: SEVERITY.ERROR,
            uid: 'delete-' + deleteActiveNote,
            title: error.message,
          });
        }
      });
  }

  return true;
}

export function removeWorkspace(wsName?: WsName) {
  wsName = wsName || nsmApi2.workspace.workspaceState().wsName;

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
    internalApi.workspace.deleteWorkspace(wsName);

    nsmApi2.ui.showNotification({
      buttons: [],
      severity: SEVERITY.SUCCESS,
      uid: 'success-removed-' + wsName,
      title: 'Successfully removed ' + wsName,
    });
  }
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
