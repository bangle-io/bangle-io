import { useCallback, useContext } from 'react';
import { UIManagerContext } from 'bangle-io/app/UIManager';
import { pickADirectory } from 'bangle-io/app/workspace/nativefs-helpers';
import {
  useCreateMdFile,
  useDeleteFile,
  useRenameActiveFile,
  useWorkspacePath,
  useWorkspaces,
} from 'bangle-io/app/workspace/workspace-hooks';
import { COMMAND_PALETTE, INPUT_PALETTE } from '../paletteTypes';
const LOG = false;

let log = LOG ? console.log.bind(console, 'play/command-palette') : () => {};

/**
 * see FilePalette documentation
 */
export function useCommandPalette({ updatePalette }) {
  return [
    useToggleTheme(),
    useToggleSidebar(),
    useNewFile({ updatePalette }),
    useDeleteActiveWorkspace(),
    useNewBrowserWS({ updatePalette }),
    useNewFileSystemWS(),
    useRenameFile({ updatePalette }),
    useDeleteActiveFile(),
  ];
}

function useToggleTheme() {
  const { dispatch } = useContext(UIManagerContext);
  const uid = 'TOGGLE_THEME_COMMAND';
  const onExecuteItem = useCallback(() => {
    dispatch({
      type: 'UI/TOGGLE_THEME',
    });
  }, [dispatch]);

  return queryMatch({
    uid,
    title: 'View: Toggle theme',
    onExecuteItem,
  });
}

function useToggleSidebar() {
  const { dispatch } = useContext(UIManagerContext);
  const uid = 'TOGGLE_SIDEBAR_COMMAND';
  const onExecuteItem = useCallback(() => {
    dispatch({
      type: 'UI/TOGGLE_SIDEBAR',
    });
  }, [dispatch]);

  return queryMatch({
    uid,
    title: 'View: Toggle sidebar',
    onExecuteItem,
  });
}

function useNewFile({ updatePalette }) {
  const uid = 'NEW_FILE_COMMAND';
  const createNewFile = useCreateMdFile();
  const { wsName } = useWorkspacePath();

  const onExecuteItem = useCallback(() => {
    // timeout since parent dismisses palette upon execution
    setTimeout(() => {
      updatePalette({
        type: INPUT_PALETTE,
        metadata: {
          onInputConfirm: (query) => {
            let normalizedQuery = query;
            if (!normalizedQuery.endsWith('.md')) {
              normalizedQuery += '.md';
            }
            return createNewFile(wsName + ':' + normalizedQuery);
          },
        },
      });
    }, 0);
  }, [updatePalette, wsName, createNewFile]);
  return queryMatch({
    uid,
    title: 'Workspace: New File',
    onExecuteItem,
  });
}

function useNewBrowserWS({ updatePalette }) {
  const uid = 'NEW_BROWSER_WS_COMMAND';

  const { createWorkspace } = useWorkspaces();

  const onExecuteItem = useCallback(() => {
    // timeout since parent dismisses palette upon execution
    setTimeout(() => {
      updatePalette({
        type: INPUT_PALETTE,
        metadata: {
          onInputConfirm: (query) => {
            if (query) {
              return createWorkspace(query, 'browser');
            }
          },
        },
      });
    }, 0);
  }, [updatePalette, createWorkspace]);

  return queryMatch({
    uid,
    title: 'Workspace: New workspace in Browser',
    onExecuteItem,
  });
}

function useRenameFile({ updatePalette }) {
  const uid = 'RENAME_FILE_COMMAND';
  const { filePath } = useWorkspacePath();

  const renameActiveFile = useRenameActiveFile();

  const onExecuteItem = useCallback(
    (item) => {
      // timeout since parent dismisses palette upon execution
      setTimeout(() => {
        updatePalette({
          type: INPUT_PALETTE,
          initialQuery: filePath,
          metadata: {
            onInputConfirm: (query) => {
              if (query) {
                return renameActiveFile(query);
              }
            },
          },
        });
      }, 0);
    },
    [updatePalette, filePath, renameActiveFile],
  );
  return queryMatch({
    uid,
    title: 'Workspace: Rename file',
    hidden: !Boolean(filePath),
    onExecuteItem,
  });
}

function useNewFileSystemWS() {
  const uid = 'NEW_FS_WS_COMMAND';

  const { createWorkspace } = useWorkspaces();

  const onExecuteItem = useCallback(async () => {
    const rootDirHandle = await pickADirectory();
    await createWorkspace(rootDirHandle.name, 'nativefs', { rootDirHandle });
  }, [createWorkspace]);

  return queryMatch({
    uid,
    title: 'Workspace: New workspace in filesystem',
    onExecuteItem,
  });
}

export function useDeleteActiveWorkspace() {
  const uid = 'DELETE_ACTIVE_WORKSPACE';
  const { deleteWorkspace } = useWorkspaces();
  const { wsName } = useWorkspacePath();

  const onExecuteItem = useCallback(
    (item) => {
      deleteWorkspace(wsName);
    },
    [deleteWorkspace, wsName],
  );

  return queryMatch({
    uid,
    title: 'Workspace: Delete active workspace',
    onExecuteItem,
  });
}

export function useDeleteActiveFile() {
  const uid = 'DELETE_ACTIVE_FILE';
  const deleteFile = useDeleteFile();
  const { wsPath, filePath } = useWorkspacePath();

  const onExecuteItem = useCallback(() => {
    deleteFile(wsPath);
  }, [deleteFile, wsPath]);

  return queryMatch({
    uid,
    hidden: !Boolean(filePath),
    title: `Workspace: Delete current file '${filePath}'`,
    onExecuteItem,
  });
}

function queryMatch(command) {
  return ({ query, paletteType }) => {
    if (paletteType !== COMMAND_PALETTE) {
      return undefined;
    }
    if (command.hidden) {
      return undefined;
    }

    const keywords = command.keywords || '';

    if (keywords.length > 0) {
      if (strMatch(keywords.split(','), query)) {
        return command;
      }
    }
    return strMatch(command.title, query) ? command : undefined;
  };
}

function strMatch(a, b) {
  b = b.toLocaleLowerCase();
  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase();
  return a.includes(b) || b.includes(a);
}
