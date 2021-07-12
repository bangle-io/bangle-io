import { useCallback, useContext } from 'react';
import { useEditorManagerContext } from 'editor-manager-context';

/**
 * Returns a callback which will accept a bangle editor command and ...params
 * and on calling this callback it will execute the command.
 */
export function useDispatchPrimaryEditor(dry = true) {
  const { primaryEditor } = useEditorManagerContext();
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
