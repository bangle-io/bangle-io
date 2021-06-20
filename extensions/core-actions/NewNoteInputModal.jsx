import React, { useContext, useCallback, useState } from 'react';
import {
  filePathToWsPath,
  isValidNoteWsPath,
  PathValidationError,
  resolvePath,
} from 'ws-path/index';
import { useWorkspaceContext } from 'workspace-context/index';
import { useDestroyRef } from 'utils/hooks';
import { InputModal } from './InputModal';
import { randomName } from 'utils/index';
import { PaletteInfo, PaletteInfoItem } from 'ui-components';
import { ExtensionRegistryContext } from 'extension-registry';

export function NewNoteInputModal({ initialValue, dismissModal }) {
  const destroyedRef = useDestroyRef();
  const extensionRegistry = useContext(ExtensionRegistryContext);
  const { wsName, createNote } = useWorkspaceContext();
  const [error, updateError] = useState();

  const onExecute = useCallback(
    async (inputValue) => {
      if (
        !inputValue ||
        inputValue.endsWith('/') ||
        inputValue.endsWith('/.md')
      ) {
        updateError(new Error('Must provide a note name'));
        return;
      }
      let newWsPath = filePathToWsPath(wsName, inputValue);

      if (!isValidNoteWsPath(newWsPath)) {
        newWsPath += '.md';
      }
      try {
        await createNote(extensionRegistry, newWsPath);
        dismissModal();
      } catch (error) {
        if (destroyedRef.current) {
          return;
        }
        updateError(error);
        if (!(error instanceof PathValidationError)) {
          throw error;
        }
      }
    },
    [extensionRegistry, dismissModal, createNote, destroyedRef, wsName],
  );

  return (
    <InputModal
      placeholder="Enter the name of your note"
      onExecute={onExecute}
      dismissModal={dismissModal}
      updateError={updateError}
      error={error}
      initialValue={initialValue || randomName()}
      selectOnMount={true}
    >
      <PaletteInfo>
        <PaletteInfoItem>
          You are providing a name for your note
        </PaletteInfoItem>
      </PaletteInfo>
    </InputModal>
  );
}

export function RenameNoteInputModal({ dismissModal }) {
  const destroyedRef = useDestroyRef();

  const { wsName, renameNote, primaryWsPath } = useWorkspaceContext();
  const [error, updateError] = useState();
  const onExecute = useCallback(
    async (inputValue) => {
      if (
        !inputValue ||
        inputValue.endsWith('/') ||
        inputValue.endsWith('/.md')
      ) {
        updateError(new Error('Must provide a note name'));
        return;
      }
      let newWsPath = filePathToWsPath(wsName, inputValue);

      if (!isValidNoteWsPath(newWsPath)) {
        newWsPath += '.md';
      }
      try {
        await renameNote(primaryWsPath, newWsPath);
        dismissModal();
      } catch (error) {
        if (destroyedRef.current) {
          return;
        }
        updateError(error);
        if (!(error instanceof PathValidationError)) {
          throw error;
        }
      }
    },
    [primaryWsPath, dismissModal, renameNote, destroyedRef, wsName],
  );

  return (
    <InputModal
      placeholder="Enter the new name"
      onExecute={onExecute}
      dismissModal={dismissModal}
      updateError={updateError}
      error={error}
      initialValue={resolvePath(primaryWsPath).filePath}
      selectOnMount={true}
    >
      <PaletteInfo>
        <PaletteInfoItem>
          You are currently renaming "{resolvePath(primaryWsPath).filePath}"
        </PaletteInfoItem>
      </PaletteInfo>
    </InputModal>
  );
}
