import { useFocusManager } from '@react-aria/focus';
import React, { useCallback, useReducer } from 'react';

import { useSerialOperationContext } from '@bangle.io/api';
import {
  BaseFileSystemError,
  NATIVE_BROWSER_PERMISSION_ERROR,
  NATIVE_BROWSER_USER_ABORTED_ERROR,
  pickADirectory,
} from '@bangle.io/baby-fs';
import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import { CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE } from '@bangle.io/constants';
import type { DialogComponentType } from '@bangle.io/shared-types';
import { ActionButton, ButtonContent } from '@bangle.io/ui-bangle-button';
import { CloseIcon, Dialog } from '@bangle.io/ui-components';

import type { WorkspaceCreateErrorTypes } from './common';
import {
  BROWSE_BUTTON_ID,
  CLICKED_TOO_SOON_ERROR,
  ERROR_PICKING_DIRECTORY_ERROR,
  UNKNOWN_ERROR,
  WORKSPACE_AUTH_REJECTED_ERROR,
} from './common';
import { ShowError } from './ShowError';

interface ModalState {
  error: WorkspaceCreateErrorTypes | undefined;
  workspace: undefined | { name: string; rootDir: FileSystemDirectoryHandle };
}

type ModalStateAction =
  | {
      type: 'update_workspace';
      workspace: Exclude<ModalState['workspace'], undefined>;
    }
  | { type: 'update_error'; error: WorkspaceCreateErrorTypes | undefined }
  | { type: 'reset' };

const modalReducer = (
  state: ModalState,
  action: ModalStateAction,
): ModalState => {
  switch (action.type) {
    case 'update_workspace':
      return { ...state, workspace: action.workspace, error: undefined };
    case 'update_error':
      return { ...state, error: action.error };

    case 'reset':
      return {
        error: undefined,
        workspace: undefined,
      };
  }
};

export const NewNativeFsWorkspaceDialog: DialogComponentType = ({
  onDismiss: _onDismiss,
  dialogName,
}) => {
  const bangleStore = useBangleStoreContext();
  const [modalState, updateModalState] = useReducer(modalReducer, {
    error: undefined,
    workspace: undefined,
  });

  const onDismiss = useCallback(() => {
    _onDismiss(dialogName);
  }, [_onDismiss, dialogName]);

  const updateRootDirHandle = useCallback(
    (value: FileSystemDirectoryHandle | undefined) => {
      if (value) {
        updateModalState({
          type: 'update_workspace',
          workspace: { name: value.name, rootDir: value },
        });
      } else {
        updateModalState({ type: 'reset' });
      }
    },
    [],
  );
  const errorType = modalState.error;

  const setError = useCallback((value?: WorkspaceCreateErrorTypes) => {
    updateModalState({
      type: 'update_error',
      error: value,
    });
  }, []);

  const { dispatchSerialOperation } = useSerialOperationContext();

  const createWorkspace = useCallback(() => {
    if (!modalState.workspace) {
      return;
    }

    dispatchSerialOperation({
      name: CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE,
      value: { rootDirHandle: modalState.workspace.rootDir },
    });
    onDismiss();
  }, [dispatchSerialOperation, modalState, onDismiss]);

  return (
    <Dialog
      isDismissable
      headingTitle="New Workspace"
      onDismiss={onDismiss}
      size="medium"
      primaryButtonConfig={{
        disabled: !modalState.workspace,
        onPress: createWorkspace,
        text: 'Create workspace',
      }}
    >
      {errorType && (
        <div className="mb-5">
          <ShowError errorType={errorType} closeModal={onDismiss} />
        </div>
      )}
      <div className="flex flex-col mb-5">
        <div className="mb-2">
          <h2 className="text-lg font-medium">Location</h2>
          <span className="text-sm" style={{ color: 'var(--BV-text-color-1)' }}>
            Select a folder where Bangle.io will put all your notes. You can use
            an existing folder or create a new one.
          </span>
        </div>
        <PickStorageDirectory
          setError={setError}
          dirName={modalState.workspace?.rootDir?.name}
          updateRootDirHandle={updateRootDirHandle}
        />
      </div>
    </Dialog>
  );
};

function PickStorageDirectory({
  setError,
  updateRootDirHandle,
  dirName,
}: {
  setError: (error: WorkspaceCreateErrorTypes) => void;
  updateRootDirHandle: (
    fileStorage: FileSystemDirectoryHandle | undefined,
  ) => void;
  dirName: string | undefined;
}) {
  const focusManager = useFocusManager();

  const handlePickDirectory = useCallback(
    async (e) => {
      try {
        const rootDirHandle = await pickADirectory();
        updateRootDirHandle(rootDirHandle);

        if (e.pointerType === 'keyboard') {
          requestAnimationFrame(() => {
            focusManager.focusNext({ wrap: true });
          });
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.message
            .toLocaleLowerCase()
            .includes('user activation is required')
        ) {
          setError(CLICKED_TOO_SOON_ERROR);

          return;
        }
        if (
          error instanceof BaseFileSystemError &&
          (error.code === NATIVE_BROWSER_PERMISSION_ERROR ||
            error.code === NATIVE_BROWSER_USER_ABORTED_ERROR)
        ) {
          setError(WORKSPACE_AUTH_REJECTED_ERROR);

          return;
        }
        if (error instanceof BaseFileSystemError) {
          setError(ERROR_PICKING_DIRECTORY_ERROR);

          return;
        }
        setError(UNKNOWN_ERROR);
        throw error;
      }
    },
    [updateRootDirHandle, focusManager, setError],
  );

  return (
    <>
      <div>
        {dirName ? (
          <ActionButton
            autoFocus={true}
            ariaLabel="pick directory"
            onPress={() => {
              updateRootDirHandle(undefined);
            }}
            id={BROWSE_BUTTON_ID}
          >
            <ButtonContent
              text={dirName}
              icon={<CloseIcon />}
              iconPos="right"
              size="small"
            />
          </ActionButton>
        ) : (
          <ActionButton
            autoFocus={true}
            ariaLabel="pick directory"
            onPress={handlePickDirectory}
            id={BROWSE_BUTTON_ID}
          >
            <ButtonContent text="Browse" />
          </ActionButton>
        )}
      </div>
    </>
  );
}
