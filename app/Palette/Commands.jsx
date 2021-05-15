import { INPUT_PALETTE } from './paletteTypes';
import {
  copyWorkspace,
  isValidNoteWsPath,
  useCreateNote,
  useWorkspacePath,
  useWorkspaces,
} from 'workspace/index';
import { useCallback, useContext } from 'react';
import { UIManagerContext } from 'ui-context';
import { EditorManagerContext } from '../editor/EditorManager';
import { InputPaletteOption } from './Palettes/InputPalette';
import { pickADirectory } from 'baby-fs';

/**
 * On generic commands
 * The hook has no parameter and returns a single value the callback which
 * may accept parameter that works as a command.
 * Commands are supposed to be fire and sort of forget -- in the sense
 * donot wait on the returned value of callback.
 */

/**
 *
 * @returns
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

              let newWsPath = wsName + ':' + normalizedQuery;
              if (!isValidNoteWsPath(newWsPath)) {
                newWsPath += '.md';
              }

              return createNote(bangleIOContext, newWsPath);
            },
          },
        },
      });
    },
    [createNote, bangleIOContext, dispatch, wsName],
  );

  return createNoteCallback;
}

export function useUpdatePaletteCommand() {
  const { dispatch } = useContext(UIManagerContext);
  return useCallback(
    ({ type, initialQuery, metadata }) => {
      dispatch({
        type: 'UI/CHANGE_PALETTE_TYPE',
        value: { type: type, initialQuery, metadata },
      });
    },
    [dispatch],
  );
}

/**
 * Opens an input palette that will prompt user for the type of
 * storage and then clone the files from current ws into the new ws.
 */
export function useCloneWorkspaceCommand() {
  const { createWorkspace } = useWorkspaces();
  const { wsName, refreshHistoryStateKey } = useWorkspacePath();
  const updatePalette = useUpdatePaletteCommand();

  return useCallback(() => {
    updatePalette({
      type: INPUT_PALETTE,
      metadata: {
        placeholder: 'Please select the storage type of workspace',
        availableOptions: [
          new InputPaletteOption({
            uid: 'nativefs',
            title: 'Native file storage (recommended)',
          }),
          new InputPaletteOption({
            uid: 'browser',
            title: 'Browser storage',
          }),
        ],
        onInputConfirm: async (query) => {
          if (query === 'nativefs') {
            const rootDirHandle = await pickADirectory();
            await createWorkspace(rootDirHandle.name, 'nativefs', {
              rootDirHandle,
            });

            await copyWorkspace(wsName, rootDirHandle.name);
            refreshHistoryStateKey();
            return true;
          } else if (query === 'browser') {
            setTimeout(() => {
              updatePalette({
                type: INPUT_PALETTE,
                metadata: {
                  placeholder: 'Please give your workspace a name',
                  onInputConfirm: async (query) => {
                    if (query) {
                      await createWorkspace(query, 'browser');
                      await copyWorkspace(wsName, query);
                      refreshHistoryStateKey();
                    }
                  },
                },
              });
            }, 0);
            return false;
          } else {
            throw new Error('Unknown query');
          }
        },
      },
    });
  }, [updatePalette, createWorkspace, wsName, refreshHistoryStateKey]);
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
