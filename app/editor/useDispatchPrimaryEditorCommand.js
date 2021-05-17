import { useCallback, useContext } from 'react';
import { EditorManagerContext } from './EditorManager';

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
