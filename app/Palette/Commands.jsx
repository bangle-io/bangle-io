import { INPUT_PALETTE } from './paletteTypes';
import { useCreateNote, useWorkspacePath } from 'workspace/index';
import { useCallback, useContext } from 'react';
import { UIManagerContext } from 'ui-context';
import { EditorManagerContext } from '../editor/EditorManager';

/**
 * Opens an input palette
 */
export function useInputPaletteNewNoteCommand() {
  const { bangleIOContext } = useContext(EditorManagerContext);

  const createNote = useCreateNote();
  const { wsName } = useWorkspacePath();

  const { dispatch } = useContext(UIManagerContext);

  const createNoteCallback = useCallback(
    ({ initialQuery = '' } = {}) => {
      dispatch({
        type: 'UI/CHANGE_PALETTE_TYPE',
        value: {
          type: INPUT_PALETTE,
          initialQuery,
          metadata: {
            paletteInfo: 'You are currently creating a new note',
            placeholder: 'Type the name of the note to create',
            onInputConfirm: (query) => {
              let normalizedQuery = query;
              if (!query) {
                return Promise.reject(new Error('Must provide a note name'));
              }
              if (!normalizedQuery.endsWith('.md')) {
                normalizedQuery += '.md';
              }
              return createNote(
                bangleIOContext,
                wsName + ':' + normalizedQuery,
              );
            },
          },
        },
      });
    },
    [createNote, bangleIOContext, dispatch, wsName],
  );

  return createNoteCallback;
}

/**
 * Returns a callback which will accept a bangle command and ...params
 * and on calling this callback it will execute the command.
 */
export function useDispatchPrimaryEditorCommand(dry = true) {
  const { primaryEditor } = useContext(EditorManagerContext);
  return useCallback(
    (editorCommand, ...params) => {
      if (!primaryEditor || primaryEditor.destroyed) {
        return false;
      }
      const { dispatch, state } = primaryEditor.view;
      if (dry) {
        const result = editorCommand(...params)(state);
        return result;
      }

      return editorCommand(...params)(state, dispatch, primaryEditor.view);
    },
    [dry, primaryEditor],
  );
}
