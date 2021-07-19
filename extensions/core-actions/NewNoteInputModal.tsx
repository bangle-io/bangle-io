import { useExtensionRegistryContext } from 'extension-registry';
import React, { useCallback, useState } from 'react';
import { InputPalette, UniversalPalette } from 'ui-components';
import { useUIManagerContext } from 'ui-context';
import { randomName } from 'utils';
import { useDestroyRef } from 'utils/hooks';
import { useWorkspaceContext } from 'workspace-context';
import {
  filePathToWsPath,
  isValidNoteWsPath,
  PathValidationError,
  resolvePath,
} from 'ws-path';

export function NewNoteInputModal({ initialValue, onDismiss }) {
  const destroyedRef = useDestroyRef();
  const extensionRegistry = useExtensionRegistryContext();
  const { wsName, createNote } = useWorkspaceContext();
  const [error, updateError] = useState<Error | undefined>();
  const { widescreen } = useUIManagerContext();

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
      if (!wsName) {
        updateError(new Error('No workspace open'));
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
  const { widescreen } = useUIManagerContext();

  const { wsName, renameNote, primaryWsPath } = useWorkspaceContext();
  const [error, updateError] = useState<Error | undefined>();
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

      if (!wsName) {
        updateError(new Error('No workspace open'));
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

  const initialValue = primaryWsPath ? resolvePath(primaryWsPath).filePath : '';
  return (
    <InputPalette
      placeholder="Enter the new name"
      onExecute={onExecute}
      onDismiss={onDismiss}
      updateError={updateError}
      error={error}
      initialValue={initialValue}
      selectOnMount={true}
      widescreen={widescreen}
    >
      <UniversalPalette.PaletteInfo>
        <UniversalPalette.PaletteInfoItem>
          You are currently renaming "{initialValue}"
        </UniversalPalette.PaletteInfoItem>
      </UniversalPalette.PaletteInfo>
    </InputPalette>
  );
}
