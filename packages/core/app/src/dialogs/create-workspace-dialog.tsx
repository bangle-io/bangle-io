import { pickADirectory, supportsNativeBrowserFs } from '@bangle.io/baby-fs';
import { throwAppError } from '@bangle.io/base-utils';
import {
  DESKTOP_REMOTE_FS_SERVER_URL,
  WORKSPACE_STORAGE_TYPE,
} from '@bangle.io/constants';
import { useCoreServices } from '@bangle.io/context';
import { CreateWorkspaceDialog as UICreateWorkspaceDialog } from '@bangle.io/ui-components';
import { WsPath } from '@bangle.io/ws-path';
import { useAtom } from 'jotai';
import React from 'react';
import { nativeFsErrorParse } from '../common';

/** A dialog component for creating a new workspace, allowing selection of storage type. */
export function CreateWorkspaceDialog() {
  const coreServices = useCoreServices();
  const [openWsDialog, setOpenWsDialog] = useAtom(
    coreServices.workbenchState.$openWsDialog,
  );
  // Default the remote workspace URL to the most useful value for the current
  // host: the desktop sentinel on Electron, this same origin when the app is
  // served by a bundled file server, or empty for a hosted (BYO-server) app.
  const desktopBridge =
    typeof window !== 'undefined' ? window.bangleDesktop?.remoteFs : undefined;
  const defaultRemoteServerUrl = desktopBridge
    ? DESKTOP_REMOTE_FS_SERVER_URL
    : typeof window !== 'undefined' && window.__BANGLE_REMOTE__?.bundled
      ? window.location.origin
      : '';
  return (
    <UICreateWorkspaceDialog
      open={openWsDialog}
      onOpenChange={setOpenWsDialog}
      defaultRemoteServerUrl={defaultRemoteServerUrl}
      validateWorkspace={({ name: wsName }) => {
        const result = WsPath.safeFromParts(wsName, '');
        if (result.ok) {
          return { isValid: true };
        }

        return {
          isValid: false,
          message:
            result.validationError?.reason ||
            t.app.dialogs.createWorkspace.invalidName,
        };
      }}
      onDone={async ({ name: wsName, type, dirHandle, serverUrl, token }) => {
        if (type === WORKSPACE_STORAGE_TYPE.Remote) {
          if (!serverUrl) {
            throwAppError(
              'error::workspace:invalid-metadata',
              `Server URL for ${wsName} is required`,
              { wsName },
            );
          }

          await coreServices.workspaceOps.createWorkspaceInfo({
            name: wsName,
            type,
            metadata: {
              serverUrl,
              ...(token ? { token } : {}),
            },
          });
          setOpenWsDialog(false);
          coreServices.navigation.goWorkspace(wsName);
          return;
        }

        if (type === WORKSPACE_STORAGE_TYPE.NativeFS) {
          if (!dirHandle) {
            throwAppError(
              'error::workspace:invalid-metadata',
              `Directory handle for ${wsName} is invalid `,
              {
                wsName: wsName,
              },
            );
          }

          await coreServices.workspaceOps.createWorkspaceInfo({
            name: wsName,
            type,
            metadata: {
              rootDirHandle: dirHandle,
            },
          });
          setOpenWsDialog(false);
          coreServices.navigation.goWorkspace(wsName);
          return;
        }

        if (type === WORKSPACE_STORAGE_TYPE.Browser) {
          await coreServices.workspaceOps.createWorkspaceInfo({
            metadata: {},
            name: wsName,
            type: WORKSPACE_STORAGE_TYPE.Browser,
          });
          setOpenWsDialog(false);
          coreServices.navigation.goWorkspace(wsName);
          return;
        }

        throwAppError(
          'error::workspace:unknown-ws-type',
          'Unknown workspace type',
          {
            wsName: wsName,
            type,
          },
        );
      }}
      storageTypes={[
        {
          type: WORKSPACE_STORAGE_TYPE.Browser,
          title: t.app.dialogs.createWorkspace.browserTitle,
          description: t.app.dialogs.createWorkspace.browserDescription,
        },
        {
          type: WORKSPACE_STORAGE_TYPE.NativeFS,
          title: t.app.dialogs.createWorkspace.nativeFsTitle,
          description: t.app.dialogs.createWorkspace.nativeFsDescription,
          disabled: !supportsNativeBrowserFs(),
        },
        {
          type: WORKSPACE_STORAGE_TYPE.Remote,
          title: t.app.dialogs.createWorkspace.remoteTitle,
          description: t.app.dialogs.createWorkspace.remoteDescription,
        },
      ]}
      onDirectoryPick={async () => {
        try {
          const dirHandle = await pickADirectory();
          return { type: 'success', dirHandle };
        } catch (error) {
          if (!(error instanceof Error)) {
            throw error;
          }

          return nativeFsErrorParse(error);
        }
      }}
    />
  );
}
