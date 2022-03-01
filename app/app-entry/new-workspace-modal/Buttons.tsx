import React, { useCallback } from 'react';

import {
  BaseFileSystemError,
  NATIVE_BROWSER_PERMISSION_ERROR,
  NATIVE_BROWSER_USER_ABORTED_ERROR,
  pickADirectory,
} from '@bangle.io/baby-fs';
import { ActionButton, ButtonContent } from '@bangle.io/ui-bangle-button';
import { CloseIcon } from '@bangle.io/ui-components';

import {
  BROWSE_BUTTON_ID,
  CLICKED_TOO_SOON_ERROR,
  ERROR_PICKING_DIRECTORY_ERROR,
  UNKNOWN_ERROR,
  WORKSPACE_AUTH_REJECTED_ERROR,
  WorkspaceCreateErrorTypes,
} from './common';

export function PickStorageDirectory({
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
  const handlePickDirectory = useCallback(async () => {
    try {
      const rootDirHandle = await pickADirectory();
      updateRootDirHandle(rootDirHandle);
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
  }, [updateRootDirHandle, setError]);

  return (
    <>
      <div className="mb-2">
        <h2 className="text-lg font-medium">Location</h2>
        <span className="text-sm" style={{ color: 'var(--textColor-1)' }}>
          Select a folder where Bangle.io will put all your notes. You can use
          an existing folder which has Markdown notes or create a new folder.
        </span>
      </div>
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

export function WorkspaceNameInput({
  value = '',
  updateValue,
  isDisabled,
  onPressEnter,
}: {
  isDisabled: boolean;
  value?: string | undefined;
  updateValue?: (str: string) => void;
  onPressEnter?: () => void;
}) {
  return (
    <>
      <div className="mb-2">
        <h2 className="text-lg font-medium">Workspace name</h2>
        <div className="mt-2 text-lg" style={{ color: 'var(--textColor-1)' }}>
          <input
            aria-label="workspace name input"
            className="pl-2"
            disabled={isDisabled}
            value={value}
            onChange={(e) => {
              updateValue?.(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onPressEnter?.();
              }
            }}
            style={{
              border: '1px solid var(--window-borderColor-0)',
              backgroundColor: 'var(--window-bgColor-0)',
            }}
          />
        </div>
      </div>
    </>
  );
}
