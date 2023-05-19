import React, { useCallback, useState } from 'react';

import { editor, nsmApi2 } from '@bangle.io/api';
import { useNsmPlainStore } from '@bangle.io/bangle-store-context';
import {
  NEW_NOTE_DIALOG_NAME,
  RENAME_NOTE_DIALOG_NAME,
  SEVERITY,
} from '@bangle.io/constants';
import { useNsmEditorManagerState } from '@bangle.io/slice-editor-manager';
import { focusEditorIfNotFocused } from '@bangle.io/slice-editor-manager/nsm-editor-manager-slice';
import { useUIManagerContext } from '@bangle.io/slice-ui';
import { useWorkspaceContext } from '@bangle.io/slice-workspace';
import { InputPalette, UniversalPalette } from '@bangle.io/ui-components';
import { BaseError, randomName, useDestroyRef } from '@bangle.io/utils';
import {
  createWsPath,
  filePathToWsPath,
  isValidNoteWsPath,
  PathValidationError,
  resolvePath,
} from '@bangle.io/ws-path';

export function NewNoteInputModal() {
  const { dispatch, dialogName, dialogMetadata } = useUIManagerContext();
  const { primaryEditor } = useNsmEditorManagerState();

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
  const { wsName } = nsmApi2.workspace.useWorkspace();
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
        await nsmApi2.workspace.createNote(createWsPath(newWsPath), {
          open: true,
        });

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
    [onDismiss, destroyedRef, wsName],
  );

  if (dialogName !== NEW_NOTE_DIALOG_NAME) {
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
  const nsmStore = useNsmPlainStore();

  const onDismiss = useCallback(
    (focusEditor = true) => {
      dispatch({
        name: 'action::@bangle.io/slice-ui:DISMISS_DIALOG',
        value: {
          dialogName: [RENAME_NOTE_DIALOG_NAME],
        },
      });

      if (focusEditor) {
        focusEditorIfNotFocused(nsmStore.state);
      }
    },
    [nsmStore, dispatch],
  );

  const destroyedRef = useDestroyRef();
  const { widescreen } = useUIManagerContext();

  const { wsName, bangleStore } = useWorkspaceContext();

  const targetWsPath = editor.getFocusedWsPath(nsmStore.state);

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
        const targetWsPathFixed = createWsPath(targetWsPath);
        const newWsPathFixed = createWsPath(newWsPath);
        await nsmApi2.workspace.renameNote(targetWsPathFixed, newWsPathFixed);
        onDismiss();
      } catch (error) {
        if (destroyedRef.current) {
          return;
        }
        onDismiss();

        if (!(error instanceof Error)) {
          throw error;
        }

        if (error instanceof BaseError) {
          nsmApi2.ui.showNotification({
            severity: SEVERITY.ERROR,
            uid: 'error-rename-note-' + targetWsPath,
            title: 'Unable to rename note',
            content: error.message,
          });

          return;
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
