import React, { useContext, useCallback, useState } from 'react';
import {
  isValidNoteWsPath,
  useWorkspacePath,
  PathValidationError,
} from 'workspace/index';
import { EditorManagerContext } from 'editor-manager-context/index';
import { useWorkspaceHooksContext } from 'workspace-hooks/index';
import { useDestroyRef } from 'utils/hooks';
import { InputModal } from './InputModal';
import { randomName } from 'utils/index';
import { PaletteInfo, PaletteInfoItem } from 'ui-components';

export function NewNoteInputModal({ dismissModal }) {
  const destroyedRef = useDestroyRef();
  const { extensionRegistry } = useContext(EditorManagerContext);
  const { createNote } = useWorkspaceHooksContext();
  const { wsName } = useWorkspacePath();
  const [error, updateError] = useState();
  const onExecute = useCallback(
    async (inputValue) => {
      if (!inputValue) {
        updateError(new Error('Must provide a note name'));
        return;
      }
      let newWsPath = wsName + ':' + inputValue;
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
      initialValue={randomName()}
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
  const { filePath, wsName, wsPath } = useWorkspacePath();

  const { renameNote } = useWorkspaceHooksContext();
  const [error, updateError] = useState();
  const onExecute = useCallback(
    async (inputValue) => {
      if (!inputValue) {
        updateError(new Error('Must provide a note name'));
        return;
      }
      let newWsPath = wsName + ':' + inputValue;
      if (!isValidNoteWsPath(newWsPath)) {
        newWsPath += '.md';
      }
      try {
        await renameNote(wsPath, newWsPath);
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
    [wsPath, dismissModal, renameNote, destroyedRef, wsName],
  );

  return (
    <InputModal
      placeholder="Enter the new name"
      onExecute={onExecute}
      dismissModal={dismissModal}
      updateError={updateError}
      error={error}
      initialValue={filePath}
      selectOnMount={true}
    >
      <PaletteInfo>
        <PaletteInfoItem>
          You are currently renaming "{filePath}"
        </PaletteInfoItem>
      </PaletteInfo>
    </InputModal>
  );
}
