import { pickADirectory, supportsNativeBrowserFs } from '@bangle.io/baby-fs';
import { throwAppError } from '@bangle.io/base-utils';
import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { useCoreServices } from '@bangle.io/context';
import { CreateWorkspaceDialog as UICreateWorkspaceDialog } from '@bangle.io/ui-components';
import { WsPath } from '@bangle.io/ws-path';
import { useAtom } from 'jotai';
import React from 'react';
import { nativeFsErrorParse } from '../common';

/** A dialog component for creating a new workspace, allowing selection of storage type and name. */
export function CreateWorkspaceDialog() {
  const coreServices = useCoreServices();
  const [openWsDialog, setOpenWsDialog] = useAtom(
    coreServices.workbenchState.$openWsDialog,
  );
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
      onDone={({ name: wsName, type, dirHandle }) => {
        setOpenWsDialog(false);
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
              metadata: {},
              name: wsName,
              type: WORKSPACE_STORAGE_TYPE.Browser,
            })
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
