import { useEditorManagerContext } from 'editor-manager-context';
import { useCallback } from 'react';

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
