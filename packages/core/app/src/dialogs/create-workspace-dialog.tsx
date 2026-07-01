import { pickADirectory, supportsNativeBrowserFs } from '@bangle.io/baby-fs';
import { throwAppError } from '@bangle.io/base-utils';
import {
  DEFAULT_WORKSPACE_ATTACHMENT_CONFIG,
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
  const [serverFsSupported, setServerFsSupported] = React.useState(false);

  React.useEffect(() => {
    let ignore = false;

    if (!openWsDialog) {
      setServerFsSupported(false);
      return () => {
        ignore = true;
      };
    }

    const serverFsService =
      coreServices.fileSystem.fileStorageServices[
        WORKSPACE_STORAGE_TYPE.ServerFS
      ];

    if (!serverFsService) {
      setServerFsSupported(false);
      return () => {
        ignore = true;
      };
    }

    void Promise.resolve(serverFsService.isSupported())
      .then((isSupported) => {
        if (!ignore) {
          setServerFsSupported(Boolean(isSupported));
        }
      })
      .catch(() => {
        if (!ignore) {
          setServerFsSupported(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [coreServices.fileSystem, openWsDialog]);

  return (
    <UICreateWorkspaceDialog
      open={openWsDialog}
      onOpenChange={setOpenWsDialog}
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
      onDone={async ({
        name: wsName,
        type,
        dirHandle,
        attachments,
        serverPath,
      }) => {
        const attachmentConfig =
          attachments || DEFAULT_WORKSPACE_ATTACHMENT_CONFIG;
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
              attachments: attachmentConfig,
            },
          });
          setOpenWsDialog(false);
          coreServices.navigation.goWorkspace(wsName);
          return;
        }

        if (type === WORKSPACE_STORAGE_TYPE.Browser) {
          await coreServices.workspaceOps.createWorkspaceInfo({
            metadata: {
              attachments: attachmentConfig,
            },
            name: wsName,
            type: WORKSPACE_STORAGE_TYPE.Browser,
          });
          setOpenWsDialog(false);
          coreServices.navigation.goWorkspace(wsName);
          return;
        }

        if (type === WORKSPACE_STORAGE_TYPE.ServerFS) {
          const normalizedServerPath = serverPath?.trim();
          if (!normalizedServerPath) {
            throwAppError(
              'error::workspace:invalid-metadata',
              'Server filesystem path is required',
              { wsName },
            );
          }
          const existingWorkspace =
            await coreServices.workspaceOps.getWorkspaceInfo(wsName);
          if (existingWorkspace) {
            throwAppError(
              'error::workspace:already-exists',
              'Cannot create workspace as it already exists',
              { wsName },
            );
          }
          const response = await fetch('/api/server-fs/workspaces', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              wsName,
              serverPath: normalizedServerPath,
            }),
          });
          if (!response.ok) {
            throw new Error(await response.text());
          }
          await coreServices.workspaceOps.createWorkspaceInfo({
            metadata: {
              attachments: attachmentConfig,
              serverPath: normalizedServerPath,
            },
            name: wsName,
            type: WORKSPACE_STORAGE_TYPE.ServerFS,
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
        ...(serverFsSupported
          ? [
              {
                type: WORKSPACE_STORAGE_TYPE.ServerFS,
                title: t.app.dialogs.createWorkspace.serverFsTitle,
                description: t.app.dialogs.createWorkspace.serverFsDescription,
              },
            ]
          : []),
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
