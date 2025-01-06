import { pickADirectory } from '@bangle.io/baby-fs';
import { throwAppError } from '@bangle.io/base-utils';
import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { useCoreServices } from '@bangle.io/context';
import { CreateWorkspaceDialog } from '@bangle.io/ui-components';
import { validateWsName } from '@bangle.io/ws-path/src/helpers';
import { useAtom } from 'jotai';
import React from 'react';
import { nativeFsErrorParse } from '../common/native-fs-error-parse';

export function AppCreateWorkspaceDialog() {
  const coreServices = useCoreServices();
  const [openWsDialog, setOpenWsDialog] = useAtom(
    coreServices.workbenchState.$openWsDialog,
  );
  return (
    <CreateWorkspaceDialog
      open={openWsDialog}
      onOpenChange={setOpenWsDialog}
      validateWorkspace={({ name: wsName }) => {
        const result = validateWsName(wsName);
        if (result.isValid) {
          return { isValid: true };
        }

        return {
          isValid: false,
          message: result.reason,
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
          title: 'Browser',
          description: 'Save workspace data in browser storage',
        },
        {
          type: WORKSPACE_STORAGE_TYPE.NativeFS,
          title: 'Native File System',
          description: 'Save workspace data in native file system',
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
