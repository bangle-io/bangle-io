import { INPUT_PALETTE } from './paletteTypes';
import { useCreateMdFile, useWorkspacePath } from 'workspace/index';
import { useCallback, useContext } from 'react';
import { UIManagerContext } from 'ui-context';
import { EditorManagerContext } from '../editor/EditorManager';

/**
 * Opens an input palette
 */
export function useInputPaletteNewFileCommand() {
  const { bangleIOContext } = useContext(EditorManagerContext);

  const createNewFile = useCreateMdFile();
  const { wsName } = useWorkspacePath();

  const { dispatch } = useContext(UIManagerContext);

  const createFile = useCallback(
    ({ initialQuery = '' } = {}) => {
      dispatch({
        type: 'UI/CHANGE_PALETTE_TYPE',
        value: {
          type: INPUT_PALETTE,
          initialQuery,
          metadata: {
            paletteInfo: 'You are currently creating a new file',
            placeholder: 'Type the name of the file to create',
            onInputConfirm: (query) => {
              let normalizedQuery = query;
              if (!normalizedQuery.endsWith('.md')) {
                normalizedQuery += '.md';
              }
              return createNewFile(
                bangleIOContext,
                wsName + ':' + normalizedQuery,
              );
            },
          },
        },
      });
    },
    [createNewFile, bangleIOContext, dispatch, wsName],
  );

  return createFile;
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
