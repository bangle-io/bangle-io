import {
  BaseFileSystemError,
  NATIVE_BROWSER_USER_ABORTED_ERROR,
  pickADirectory,
} from '@bangle.io/baby-fs';
import { throwAppError } from '@bangle.io/base-utils';
import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
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
        rootDirHandle = await pickADirectory();
      } catch (error) {
        if (
          error instanceof BaseFileSystemError &&
          error.code === NATIVE_BROWSER_USER_ABORTED_ERROR
        ) {
          return;
        }
        throwAppError(
          'error::workspace:native-fs-reconnect-failed',
          t.app.errors.workspace.reconnectFailed,
          { wsName },
        );
      }

      // Native FS paths are rooted by the directory name today. Accepting a
      // different folder would make a successful reconnect look like an empty
      // workspace, so preserve the old handle until the selection is valid.
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
];
