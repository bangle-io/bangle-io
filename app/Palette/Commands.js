import { INPUT_PALETTE } from './paletteTypes';
import { useCreateMdFile, useWorkspacePath } from 'workspace/index';
import { useCallback, useContext } from 'react';
import { UIManagerContext } from 'ui-context';

/**
 * Opens an input palette
 */
export function useInputPaletteNewFileCommand() {
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
            onInputConfirm: (query) => {
              let normalizedQuery = query;
              if (!normalizedQuery.endsWith('.md')) {
                normalizedQuery += '.md';
              }
              return createNewFile(wsName + ':' + normalizedQuery);
            },
          },
        },
      });
    },
    [createNewFile, dispatch, wsName],
  );

  return createFile;
}
