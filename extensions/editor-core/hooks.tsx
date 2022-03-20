import { useCallback } from 'react';

import { useEditorManagerContext } from '@bangle.io/slice-editor-manager';

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
