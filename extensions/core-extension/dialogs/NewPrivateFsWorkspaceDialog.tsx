import { FocusRing } from '@react-aria/focus';
import React, { useCallback, useReducer } from 'react';

import { useSerialOperationContext } from '@bangle.io/api';
import { CORE_OPERATIONS_CREATE_PRIVATE_FS_WORKSPACE } from '@bangle.io/constants';
import type { DialogComponentType } from '@bangle.io/shared-types';
import { Dialog, ExternalLink } from '@bangle.io/ui-components';
import { randomName } from '@bangle.io/utils';

import type { WorkspaceCreateErrorTypes } from './common';
import { ShowError } from './ShowError';

interface ModalState {
  error: WorkspaceCreateErrorTypes | undefined;
  workspace: undefined | { name: string };
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

const randomWsName = randomName();

export const NewPrivateFsWorkspaceDialog: DialogComponentType = ({
  onDismiss: _onDismiss,
  dialogName,
}) => {
  const [modalState, updateModalState] = useReducer(modalReducer, {
    error: undefined,
    workspace: {
      name: randomWsName,
    },
  });

  const onDismiss = useCallback(() => {
    _onDismiss(dialogName);
  }, [_onDismiss, dialogName]);

  const errorType = modalState.error;

  const { dispatchSerialOperation } = useSerialOperationContext();

  const createWorkspace = useCallback(() => {
    if (!modalState.workspace) {
      return;
    }
    dispatchSerialOperation({
      name: CORE_OPERATIONS_CREATE_PRIVATE_FS_WORKSPACE,
      value: { wsName: modalState.workspace.name },
    });
    onDismiss();
  }, [dispatchSerialOperation, modalState, onDismiss]);

  const updateInputWorkspaceName = useCallback((value) => {
    updateModalState({
      type: 'update_workspace',
      workspace: { name: value },
    });
  }, []);

  return (
    <Dialog
      isDismissable
      headingTitle="New Browser Workspace"
      onDismiss={onDismiss}
      size="md"
      primaryButtonConfig={{
        disabled: !modalState.workspace,
        onPress: createWorkspace,
        text: 'Create workspace',
      }}
      footer={
        <ExternalLink text="Privacy Policy" href="https://bangle.io/privacy" />
      }
    >
      {errorType && (
        <div className="mb-5">
          <ShowError errorType={errorType} closeModal={onDismiss} />
        </div>
      )}
      <div className="flex flex-col mb-5">
        <div className="mb-2">
          <h2 className="text-lg font-medium">
            Give your workspace a fancy name 👩‍🎨
          </h2>
        </div>

        <WorkspaceNameInput
          isDisabled={false}
          value={modalState.workspace?.name}
          updateValue={updateInputWorkspaceName}
          onPressEnter={errorType ? undefined : createWorkspace}
        />
      </div>
    </Dialog>
  );
};

function WorkspaceNameInput({
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
        <div className="mt-2 text-lg text-colorNeutralTextSubdued">
          <FocusRing focusClass="ring-promote">
            <input
              aria-label="workspace name input"
              className="p-1 pl-2 w-full rounded border-neutral text-field-neutral"
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
            />
          </FocusRing>
        </div>
      </div>
    </>
  );
}
