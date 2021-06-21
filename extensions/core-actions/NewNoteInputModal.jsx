import React, { useContext, useCallback, useState } from 'react';
import {
  filePathToWsPath,
  isValidNoteWsPath,
  PathValidationError,
  resolvePath,
} from 'ws-path/index';
import { useWorkspaceContext } from 'workspace-context/index';
import { useDestroyRef } from 'utils/hooks';
import { randomName } from 'utils/index';
import { InputPalette, UniversalPalette } from 'ui-components';
import { ExtensionRegistryContext } from 'extension-registry';
import { UIManagerContext } from 'ui-context';

export function NewNoteInputModal({ initialValue, onDismiss }) {
  const destroyedRef = useDestroyRef();
  const extensionRegistry = useContext(ExtensionRegistryContext);
  const { wsName, createNote } = useWorkspaceContext();
  const [error, updateError] = useState();
  const { widescreen } = useContext(UIManagerContext);

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
        onDismiss();
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
    [extensionRegistry, onDismiss, createNote, destroyedRef, wsName],
  );

  return (
    <InputPalette
      placeholder="Enter the name of your note"
      onExecute={onExecute}
      onDismiss={onDismiss}
      updateError={updateError}
      error={error}
      widescreen={widescreen}
      initialValue={initialValue || randomName()}
      selectOnMount={true}
    >
      <UniversalPalette.PaletteInfo>
        <UniversalPalette.PaletteInfoItem>
          You are providing a name for your note
        </UniversalPalette.PaletteInfoItem>
      </UniversalPalette.PaletteInfo>
    </InputPalette>
  );
}

export function RenameNoteInputModal({ onDismiss }) {
  const destroyedRef = useDestroyRef();
  const { widescreen } = useContext(UIManagerContext);

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
        onDismiss();
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
    [primaryWsPath, onDismiss, renameNote, destroyedRef, wsName],
  );

  return (
    <InputPalette
      placeholder="Enter the new name"
      onExecute={onExecute}
      onDismiss={onDismiss}
      updateError={updateError}
      error={error}
      initialValue={resolvePath(primaryWsPath).filePath}
      selectOnMount={true}
      widescreen={widescreen}
    >
      <UniversalPalette.PaletteInfo>
        <UniversalPalette.PaletteInfoItem>
          You are currently renaming "{resolvePath(primaryWsPath).filePath}"
        </UniversalPalette.PaletteInfoItem>
      </UniversalPalette.PaletteInfo>
    </InputPalette>
  );
}
