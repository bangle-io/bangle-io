import {
  copyWorkspace,
  isValidNoteWsPath,
  useWorkspacePath,
  useWorkspaces,
} from 'workspace/index';
import { useCallback, useContext } from 'react';
import { UIManagerContext } from 'ui-context/index';
import { EditorManagerContext } from 'editor-manager-context/index';
import { pickADirectory } from 'baby-fs/index';
import { INPUT_PALETTE } from 'config/paletteTypes';
import { useWorkspaceHooksContext } from 'workspace-hooks/index';
/**
 * On generic commands
 * The hook has no parameter and returns a single value the callback which
 * may accept parameter that works as a command.
 * Commands are supposed to be fire and sort of forget.
 * The commands will return a void promise which will signal
 * completion or failure, to allow for chaining of commands.
 * The commands will never resolve to a value.
 */
export function useNewNoteCmd() {
  const { extensionRegistry } = useContext(EditorManagerContext);
  const { createNote } = useWorkspaceHooksContext();
  const { wsName } = useWorkspacePath();

  const { dispatch } = useContext(UIManagerContext);

  return useCallback(
    async ({ initialQuery = '' } = {}) => {
      dispatch({
        type: 'UI/UPDATE_PALETTE',
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

              return createNote(extensionRegistry, newWsPath);
            },
          },
        },
      });
    },
    [createNote, extensionRegistry, dispatch, wsName],
  );
}

export function useUpdatePaletteCmd() {
  const { dispatch } = useContext(UIManagerContext);
  return useCallback(
    async ({ type, initialQuery, metadata }) => {
      dispatch({
        type: 'UI/UPDATE_PALETTE',
        value: { type: type, initialQuery, metadata },
      });
    },
    [dispatch],
  );
}

export function useNewWorkspace() {
  const { createWorkspace } = useWorkspaces();
  const updatePalette = useUpdatePaletteCmd();

  return useCallback(() => {
    return new Promise((res, rej) => {
      updatePalette({
        type: INPUT_PALETTE,
        metadata: {
          placeholder: 'Please select the storage type',
          availableOptions: [
            Boolean(window.showDirectoryPicker) && {
              uid: 'nativefs',
              title:
                'Your computer: will save your notes in a folder of your choice (recommended)',
            },
            {
              uid: 'browser',
              title: 'Browser: will save your notes in your browser storage',
            },
          ],
          onInputConfirm: async (query) => {
            if (query === 'nativefs') {
              const rootDirHandle = await pickADirectory();
              await createWorkspace(rootDirHandle.name, 'nativefs', {
                rootDirHandle,
              });
              window.fathom?.trackGoal('K3NFTGWX', 0);
              res();
              return true;
            } else if (query === 'browser') {
              setTimeout(() => {
                // TODO if the user never onInputConfirm
                // the promise will forever wait causing memory leak
                updatePalette({
                  type: INPUT_PALETTE,
                  metadata: {
                    placeholder: 'Please give your workspace a name',
                    onInputConfirm: async (query) => {
                      if (query) {
                        await createWorkspace(query, 'browser');
                        window.fathom?.trackGoal('AISLCLRF', 0);
                        res();
                      }
                    },
                  },
                });
              }, 0);
              return false;
            } else {
              rej(new Error('Unknown query'));
              throw new Error('Unknown query');
            }
          },
        },
      });
    });
  }, [updatePalette, createWorkspace]);
}

/**
 * Opens an input palette that will prompt user for the type of
 * storage and then clone the files from current ws into the new ws.
 */
export function useCloneWorkspaceCmd() {
  const { createWorkspace } = useWorkspaces();
  const { wsName } = useWorkspacePath();
  const updatePalette = useUpdatePaletteCmd();

  return useCallback(() => {
    return new Promise((res, rej) => {
      updatePalette({
        type: INPUT_PALETTE,
        metadata: {
          placeholder: 'Please select the storage type of workspace',
          availableOptions: [
            Boolean(window.showDirectoryPicker) && {
              uid: 'nativefs',
              title: 'Native file storage (recommended)',
            },
            {
              uid: 'browser',
              title: 'Browser storage',
            },
          ],
          onInputConfirm: async (query) => {
            if (query === 'nativefs') {
              const rootDirHandle = await pickADirectory();
              await createWorkspace(rootDirHandle.name, 'nativefs', {
                rootDirHandle,
              });

              await copyWorkspace(wsName, rootDirHandle.name);

              res();
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
                        res();
                      }
                    },
                  },
                });
              }, 0);
              return false;
            } else {
              rej(new Error('Unknown query'));
              throw new Error('Unknown query');
            }
          },
        },
      });
    });
  }, [updatePalette, createWorkspace, wsName]);
}
