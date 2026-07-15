import { throwAppError } from '@bangle.io/base-utils';
import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import {
  isFileSystemDirectoryHandle,
  isNativeFsError,
  NATIVE_FS_ERROR_CODE,
  pickDirectory,
  revealDirectoryLocation,
} from '@bangle.io/native-fs';
import { c } from '../helper';

export const nativeFsRecoveryHandlers = [
  c(
    'command::ui:reconnect-native-fs-workspace',
    async ({ workspaceOps, workbenchState }, { wsName }) => {
      const workspace = await workspaceOps.getWorkspaceInfo(wsName, {
        type: WORKSPACE_STORAGE_TYPE.NativeFS,
      });
      if (!workspace) {
        throwAppError(
          'error::workspace:not-found',
          t.app.errors.workspace.reconnectNotFound({ wsName }),
          { wsName },
        );
      }

      let rootDirHandle: FileSystemDirectoryHandle;
      try {
        rootDirHandle = await pickDirectory();
      } catch (error) {
        if (isNativeFsError(error, NATIVE_FS_ERROR_CODE.userAborted)) {
          return;
        }
        throwAppError(
          'error::workspace:native-fs-reconnect-failed',
          t.app.errors.workspace.reconnectFailed,
          { wsName },
        );
      }

      // Storage no longer roots paths in the directory name, so any folder
      // would technically load — which is exactly why the name check stays:
      // it guards against silently rebinding the workspace to the wrong
      // folder. The old handle is preserved until the selection is valid.
      if (rootDirHandle.name !== wsName) {
        throwAppError(
          'error::workspace:native-fs-reconnect-failed',
          t.app.errors.workspace.reconnectNameMismatch({
            expectedName: wsName,
            selectedName: rootDirHandle.name,
          }),
          { wsName },
        );
      }

      await workspaceOps.updateWorkspaceMetadata(wsName, (metadata) => ({
        ...metadata,
        rootDirHandle,
      }));

      // Recreate the service graph so every Native FS handle cache observes
      // the newly stored directory before any reads or writes resume.
      workbenchState.reloadUi();
    },
  ),
  c(
    'command::ui:locate-native-fs-workspace',
    async ({ workspaceOps }, { wsName }) => {
      const workspace = await workspaceOps.getWorkspaceInfo(wsName, {
        type: WORKSPACE_STORAGE_TYPE.NativeFS,
      });
      if (!workspace) {
        throwAppError(
          'error::workspace:not-found',
          t.app.errors.workspace.locateNotFound({ wsName }),
          { wsName },
        );
      }

      const rootDirHandle = workspace.metadata.rootDirHandle;
      if (!isFileSystemDirectoryHandle(rootDirHandle)) {
        // A broken entry has nothing to anchor the dialog at; pointing the
        // user at the reconnect flow beats opening a picker somewhere random.
        // This is an expected degraded state, so it uses the locate-failed
        // error (handled, non-reportable) rather than invalid-metadata.
        throwAppError(
          'error::workspace:native-fs-locate-failed',
          t.app.errors.workspace.locateMissingHandle({ wsName }),
          { wsName },
        );
      }

      // Reveal-only and best-effort: the OS dialog shows the folder's path
      // (when the browser honors the startIn suggestion), the selection is
      // discarded, and cancelling resolves silently. No metadata is written.
      try {
        await revealDirectoryLocation(rootDirHandle);
      } catch (error) {
        if (isNativeFsError(error, NATIVE_FS_ERROR_CODE.unsupported)) {
          throwAppError(
            'error::workspace:native-fs-locate-failed',
            t.app.errors.workspace.locateUnsupported,
            { wsName },
          );
        }
        throwAppError(
          'error::workspace:native-fs-locate-failed',
          t.app.errors.workspace.locateFailed,
          { wsName },
        );
      }
    },
  ),
];
