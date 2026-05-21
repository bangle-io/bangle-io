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
    const serverFsService =
      coreServices.fileSystem.fileStorageServices[
        WORKSPACE_STORAGE_TYPE.PrivateFS
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
  }, [coreServices.fileSystem]);

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
      onDone={({ name: wsName, type, dirHandle, attachments, serverPath }) => {
        setOpenWsDialog(false);
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

          coreServices.workspaceOps
            .createWorkspaceInfo({
              name: wsName,
              type,
              metadata: {
                rootDirHandle: dirHandle,
                attachments: attachmentConfig,
              },
            })
            .then(() => {
              coreServices.navigation.goWorkspace(wsName);
            });
          return;
        }

        if (type === WORKSPACE_STORAGE_TYPE.Browser) {
          coreServices.workspaceOps
            .createWorkspaceInfo({
              metadata: {
                attachments: attachmentConfig,
              },
              name: wsName,
              type: WORKSPACE_STORAGE_TYPE.Browser,
            })
            .then(() => {
              coreServices.navigation.goWorkspace(wsName);
            });
          return;
        }

        if (type === WORKSPACE_STORAGE_TYPE.PrivateFS) {
          const normalizedServerPath = serverPath?.trim();
          if (!normalizedServerPath) {
            throwAppError(
              'error::workspace:invalid-metadata',
              'Server filesystem path is required',
              { wsName },
            );
          }
          void fetch('/api/server-fs/workspaces', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              wsName,
              serverPath: normalizedServerPath,
            }),
          })
            .then(async (response) => {
              if (!response.ok) {
                throw new Error(await response.text());
              }
            })
            .then(() =>
              coreServices.workspaceOps.createWorkspaceInfo({
                metadata: {
                  attachments: attachmentConfig,
                  serverPath: normalizedServerPath,
                },
                name: wsName,
                type: WORKSPACE_STORAGE_TYPE.PrivateFS,
              }),
            )
            .then(() => {
              coreServices.navigation.goWorkspace(wsName);
            });
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
                type: WORKSPACE_STORAGE_TYPE.PrivateFS,
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
