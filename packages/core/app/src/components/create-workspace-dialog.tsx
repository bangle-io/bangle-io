import {
  BaseFileSystemError,
  NATIVE_BROWSER_PERMISSION_ERROR,
  NATIVE_BROWSER_USER_ABORTED_ERROR,
  pickADirectory,
} from '@bangle.io/baby-fs';
import { throwAppError } from '@bangle.io/base-utils';
import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { useCoreServices } from '@bangle.io/context';
import { CreateWorkspaceDialog } from '@bangle.io/ui-components';
import { validateWsName } from '@bangle.io/ws-path/src/helpers';
import { useAtom } from 'jotai';
import React from 'react';

// First add these constants
const ERROR_TYPES = {
  ERROR_PICKING_DIRECTORY: 'ERROR_PICKING_DIRECTORY',
  UNKNOWN: 'UNKNOWN_ERROR',
  WORKSPACE_AUTH_REJECTED: 'WORKSPACE_AUTH_REJECTED',
  CLICKED_TOO_SOON: 'CLICKED_TOO_SOON_ERROR',
} as const;

type ErrorType = (typeof ERROR_TYPES)[keyof typeof ERROR_TYPES];

const ERROR_MESSAGES: Record<ErrorType, { title: string; message: string }> = {
  [ERROR_TYPES.ERROR_PICKING_DIRECTORY]: {
    title: 'There was an error opening your notes folder.',
    message:
      'Please make sure your notes folder is inside a common location like Documents or Desktop.',
  },
  [ERROR_TYPES.CLICKED_TOO_SOON]: {
    title: "That didn't work",
    message: 'Please try clicking the Browse button again.',
  },
  [ERROR_TYPES.WORKSPACE_AUTH_REJECTED]: {
    title: 'Access was denied',
    message: 'Please allow access to your folder to continue.',
  },
  [ERROR_TYPES.UNKNOWN]: {
    title: 'Unknown error occurred',
    message: 'Please try again or reload the page.',
  },
};

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

          let errorType: ErrorType;

          if (
            error instanceof Error &&
            error.message.toLowerCase().includes('user activation is required')
          ) {
            errorType = ERROR_TYPES.CLICKED_TOO_SOON;
          } else if (
            error instanceof BaseFileSystemError &&
            (error.code === NATIVE_BROWSER_PERMISSION_ERROR ||
              error.code === NATIVE_BROWSER_USER_ABORTED_ERROR)
          ) {
            errorType = ERROR_TYPES.WORKSPACE_AUTH_REJECTED;
          } else if (error instanceof BaseFileSystemError) {
            errorType = ERROR_TYPES.ERROR_PICKING_DIRECTORY;
          } else {
            errorType = ERROR_TYPES.UNKNOWN;
            console.error('Unknown error during directory pick:', error);
          }

          return {
            type: 'error',
            ...ERROR_MESSAGES[errorType],
            error: error,
          };
        }
      }}
    />
  );
}
