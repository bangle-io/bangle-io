import './NewWorkspaceModal.css';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useActionContext } from '@bangle.io/action-context';
import {
  DirTypeSystemHandle,
  supportsNativeBrowserFs,
} from '@bangle.io/baby-fs';
import {
  CORE_ACTIONS_CREATE_BROWSER_WORKSPACE,
  CORE_ACTIONS_CREATE_NATIVE_FS_WORKSPACE,
} from '@bangle.io/constants';
import { ActionButton } from '@bangle.io/ui-bangle-button';
import { ButtonContent } from '@bangle.io/ui-bangle-button/ButtonContent';
import { Modal } from '@bangle.io/ui-components';
import { useUIManagerContext } from '@bangle.io/ui-context';
import { useWorkspaces } from '@bangle.io/workspaces';

import { PickStorageDirectory, WorkspaceNameInput } from './Buttons';
import {
  BROWSER,
  CREATE_BUTTON_ID,
  FILE_SYSTEM,
  INVALID_WORKSPACE_NAME_ERROR,
  WORKSPACE_NAME_ALREADY_EXISTS_ERROR,
  WorkspaceCreateErrorTypes,
  WorkspaceStorageType,
} from './common';
import { ShowError } from './ShowError';
import { StorageTypeDropdown } from './StorageTypeDropdown';

export function NewWorkspaceModal() {
  const { modal } = useUIManagerContext();
  const showModal = modal === '@modal/new-workspace';

  return showModal ? <NewWorkspaceModalContainer /> : null;
}

export function NewWorkspaceModalContainer({
  defaultStorageType = supportsNativeBrowserFs() ? FILE_SYSTEM : BROWSER,
}: {
  defaultStorageType?: WorkspaceStorageType;
}) {
  const { workspaces } = useWorkspaces();

  const { dispatch } = useUIManagerContext();
  const { dispatchAction } = useActionContext();

  const isDropdownOpenRef = useRef(false);
  const [storageType, updateStorageType] =
    useState<WorkspaceStorageType>(defaultStorageType);
  const [inputWorkspaceName, updateInputWorkspaceName] = useState<string>();
  const [errorType, setError] = useState<WorkspaceCreateErrorTypes>();

  const [rootDirHandle, updateRootDirHandle] = useState<DirTypeSystemHandle>();

  const newWorkspaceName = rootDirHandle?.name || inputWorkspaceName;

  const isCreateWorkspaceDisabled = useMemo((): boolean => {
    if (errorType) {
      return true;
    }
    if (storageType === FILE_SYSTEM) {
      return !Boolean(rootDirHandle);
    }
    if (storageType === BROWSER) {
      return !Boolean(inputWorkspaceName);
    }
    return true;
  }, [storageType, rootDirHandle, inputWorkspaceName, errorType]);

  const createWorkspace = useCallback(() => {
    if (storageType === FILE_SYSTEM && rootDirHandle) {
      dispatchAction({
        name: CORE_ACTIONS_CREATE_NATIVE_FS_WORKSPACE,
        value: { rootDirHandle },
      });
    } else if (storageType === BROWSER && inputWorkspaceName) {
      dispatchAction({
        name: CORE_ACTIONS_CREATE_BROWSER_WORKSPACE,
        value: { wsName: inputWorkspaceName },
      });
    }

    dispatch({
      type: 'UI/DISMISS_MODAL',
      value: { wsName: inputWorkspaceName },
    });
  }, [
    dispatchAction,
    inputWorkspaceName,
    storageType,
    rootDirHandle,
    dispatch,
  ]);

  const onDismiss = useCallback(() => {
    if (!isDropdownOpenRef.current) {
      dispatch({
        type: 'UI/DISMISS_MODAL',
      });
    }
  }, [dispatch]);

  // focus on create button
  useEffect(() => {
    if (rootDirHandle && !errorType) {
      document?.getElementById(CREATE_BUTTON_ID)?.focus();
    }
  }, [rootDirHandle, errorType]);

  // set error if wsName already exists
  useEffect(() => {
    const existingWorkspace =
      newWorkspaceName && workspaces.find((r) => newWorkspaceName === r.name);

    if (existingWorkspace) {
      setError(WORKSPACE_NAME_ALREADY_EXISTS_ERROR);
    } else if (errorType === WORKSPACE_NAME_ALREADY_EXISTS_ERROR) {
      setError(undefined);
    }
  }, [newWorkspaceName, workspaces, errorType, setError]);

  useEffect(() => {
    if (newWorkspaceName) {
      if (newWorkspaceName.includes(':')) {
        setError(INVALID_WORKSPACE_NAME_ERROR);
      } else if (errorType === INVALID_WORKSPACE_NAME_ERROR) {
        setError(undefined);
      }
    }
  }, [newWorkspaceName, errorType]);

  // Reset state on storageType change
  useEffect(() => {
    updateRootDirHandle(undefined);
    updateInputWorkspaceName(undefined);
    setError(undefined);
  }, [storageType]);

  return (
    <Modal
      title="New Workspace"
      onDismiss={onDismiss}
      style={{ width: '30rem', maxWidth: '30rem' }}
    >
      <div className="px-6 py-4 select-none">
        {errorType && (
          <div className="mb-5">
            <ShowError errorType={errorType} closeModal={onDismiss} />
          </div>
        )}
        <div className="flex flex-col mb-5">
          <div className="mb-2">
            <h2 className="text-lg font-medium">Storage type</h2>
            <span className="text-sm" style={{ color: 'var(--textColor-1)' }}>
              Bangle.io strongly recommends you choose <b>File system</b>{' '}
              storage because it is safer and portable. Read more at{' '}
              <a href="https://bangle.io/" className="underline">
                https://bangle.io
              </a>
              .
            </span>
          </div>
          <div>
            <StorageTypeDropdown
              storageType={storageType}
              updateStorageType={updateStorageType}
              updateIsDropdownOpen={(val) => {
                // using ref as we donot need to rerender when
                // dropdown state changes
                isDropdownOpenRef.current = val;
              }}
            />
          </div>
        </div>
        {storageType === FILE_SYSTEM && (
          <div className="flex flex-col mb-5">
            <PickStorageDirectory
              setError={setError}
              rootDirHandle={rootDirHandle}
              updateRootDirHandle={updateRootDirHandle}
            />
          </div>
        )}
        {storageType === BROWSER && (
          <div className="flex flex-col mb-5">
            <WorkspaceNameInput
              // prevent changing the name when using native file system
              isDisabled={Boolean(rootDirHandle?.name)}
              value={newWorkspaceName}
              updateValue={updateInputWorkspaceName}
              onPressEnter={
                isCreateWorkspaceDisabled ? undefined : createWorkspace
              }
            />
          </div>
        )}
        <div className="flex flex-row justify-center">
          <ActionButton
            id={CREATE_BUTTON_ID}
            ariaLabel="create workspace"
            className="px-4"
            variant="primary"
            isDisabled={isCreateWorkspaceDisabled}
            onPress={() => {
              createWorkspace();
            }}
          >
            <ButtonContent text="Create Workspace" />
          </ActionButton>
        </div>
      </div>
    </Modal>
  );
}
