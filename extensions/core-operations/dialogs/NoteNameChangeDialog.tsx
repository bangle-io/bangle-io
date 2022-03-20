import React, { useCallback, useState } from 'react';

import { editor } from '@bangle.io/api';
import { useEditorManagerContext } from '@bangle.io/slice-editor-manager';
import { useUIManagerContext } from '@bangle.io/slice-ui';
import {
  createNote,
  renameNote,
  useWorkspaceContext,
} from '@bangle.io/slice-workspace';
import { InputPalette, UniversalPalette } from '@bangle.io/ui-components';
import { randomName, useDestroyRef } from '@bangle.io/utils';
import {
  filePathToWsPath,
  isValidNoteWsPath,
  PathValidationError,
  resolvePath,
} from '@bangle.io/ws-path';

export const NEW_NOTE_DIALOG_NAME =
  'dialog::@bangle.io/core-operations:new-note-modal';

export const RENAME_NOTE_DIALOG_NAME =
  'dialog::@bangle.io/core-operations:rename-note-modal';

export function NewNoteInputModal() {
  const { dispatch, dialogName, dialogMetadata } = useUIManagerContext();
  const { primaryEditor } = useEditorManagerContext();

  const onDismiss = useCallback(
    (focusEditor = true) => {
      dispatch({
        name: 'action::@bangle.io/slice-ui:DISMISS_DIALOG',
        value: {
          dialogName: [NEW_NOTE_DIALOG_NAME],
        },
      });

      if (focusEditor) {
        primaryEditor?.focusView();
      }
    },
    [primaryEditor, dispatch],
  );

  const destroyedRef = useDestroyRef();
  const { wsName, bangleStore } = useWorkspaceContext();
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
        await createNote(newWsPath)(
          bangleStore.state,
          bangleStore.dispatch,
          bangleStore,
        );
        onDismiss();
      } catch (error) {
        if (!(error instanceof Error)) {
          throw error;
        }
        if (destroyedRef.current) {
          return;
        }
        updateError(error);

        if (!(error instanceof PathValidationError)) {
          throw error;
        }
      }
    },
    [onDismiss, bangleStore, destroyedRef, wsName],
  );

  if (dialogName !== 'dialog::@bangle.io/core-operations:new-note-modal') {
    return null;
  }

  return (
    <InputPalette
      placeholder="Enter the name of your note"
      onExecute={onExecute}
      onDismiss={onDismiss}
      updateError={updateError}
      error={error}
      widescreen={widescreen}
      initialValue={dialogMetadata?.initialValue || randomName()}
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

export function RenameNoteInputModal() {
  const { dispatch } = useUIManagerContext();
  const { primaryEditor } = useEditorManagerContext();

  const onDismiss = useCallback(
    (focusEditor = true) => {
      dispatch({
        name: 'action::@bangle.io/slice-ui:DISMISS_DIALOG',
        value: {
          dialogName: [RENAME_NOTE_DIALOG_NAME],
        },
      });

      if (focusEditor) {
        primaryEditor?.focusView();
      }
    },
    [primaryEditor, dispatch],
  );

  const destroyedRef = useDestroyRef();
  const { widescreen } = useUIManagerContext();

  const { wsName, bangleStore } = useWorkspaceContext();

  const targetWsPath = editor.getFocusedWsPath()(bangleStore.state);

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

      if (!targetWsPath) {
        updateError(new Error('No note active'));

        return;
      }

      let newWsPath = filePathToWsPath(wsName, inputValue);

      if (!isValidNoteWsPath(newWsPath)) {
        newWsPath += '.md';
      }
      try {
        await renameNote(targetWsPath, newWsPath)(
          bangleStore.state,
          bangleStore.dispatch,
          bangleStore,
        );
        onDismiss();
      } catch (error) {
        if (destroyedRef.current) {
          return;
        }
        onDismiss();

        if (!(error instanceof Error)) {
          throw error;
        }

        // pass it to the store to let the storage handler handle it
        bangleStore.errorHandler(error);
      }
    },
    [targetWsPath, onDismiss, bangleStore, destroyedRef, wsName],
  );

  const initialValue = targetWsPath ? resolvePath(targetWsPath).filePath : '';

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
