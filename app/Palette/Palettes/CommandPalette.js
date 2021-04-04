import { useCallback, useContext } from 'react';
import { UIManagerContext } from 'ui-context/index';

import {
  pickADirectory,
  useCreateMdFile,
  useDeleteFile,
  useRenameActiveFile,
  useWorkspacePath,
  useWorkspaces,
} from 'workspace-context/index';
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
    useRemoveActiveWorkspace(),
    useNewBrowserWS({ updatePalette }),
    useNewFileSystemWS(),
    useRenameFile({ updatePalette }),
    useDeleteActiveFile(),
  ];
}

function useToggleTheme() {
  const { dispatch } = useContext(UIManagerContext);
  const uid = 'TOGGLE_THEME_COMMAND';
  const onExecute = useCallback(() => {
    dispatch({
      type: 'UI/TOGGLE_THEME',
    });
    return true;
  }, [dispatch]);

  return queryMatch({
    uid,
    title: 'View: Toggle theme',
    onExecute,
  });
}

function useToggleSidebar() {
  const { dispatch } = useContext(UIManagerContext);
  const uid = 'TOGGLE_SIDEBAR_COMMAND';
  const onExecute = useCallback(() => {
    dispatch({
      type: 'UI/TOGGLE_SIDEBAR',
      value: { type: 'file-browser' },
    });
    return true;
  }, [dispatch]);

  return queryMatch({
    uid,
    title: 'View: Toggle sidebar',
    onExecute,
  });
}

function useNewFile({ updatePalette }) {
  const uid = 'NEW_FILE_COMMAND';
  const createNewFile = useCreateMdFile();
  const { wsName } = useWorkspacePath();

  const onExecute = useCallback(() => {
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
    // to prevent dismissing of the palette
    return false;
  }, [updatePalette, wsName, createNewFile]);
  return queryMatch({
    uid,
    title: 'Workspace: New File',
    onExecute,
  });
}

function useNewBrowserWS({ updatePalette }) {
  const uid = 'NEW_BROWSER_WS_COMMAND';

  const { createWorkspace } = useWorkspaces();

  const onExecute = useCallback(() => {
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
    return false;
  }, [updatePalette, createWorkspace]);

  return queryMatch({
    uid,
    title: 'Workspace: New workspace in Browser',
    onExecute,
  });
}

function useRenameFile({ updatePalette }) {
  const uid = 'RENAME_FILE_COMMAND';
  const { filePath } = useWorkspacePath();

  const renameActiveFile = useRenameActiveFile();

  const onExecute = useCallback(
    (item) => {
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
      return false;
    },
    [updatePalette, filePath, renameActiveFile],
  );
  return queryMatch({
    uid,
    title: 'Workspace: Rename file',
    hidden: !Boolean(filePath),
    onExecute,
  });
}

function useNewFileSystemWS() {
  const uid = 'NEW_FS_WS_COMMAND';

  const { createWorkspace } = useWorkspaces();

  const onExecute = useCallback(async () => {
    const rootDirHandle = await pickADirectory();
    await createWorkspace(rootDirHandle.name, 'nativefs', { rootDirHandle });
    return true;
  }, [createWorkspace]);

  return queryMatch({
    uid,
    title: 'Workspace: New workspace in filesystem',
    onExecute,
  });
}

export function useRemoveActiveWorkspace() {
  const uid = 'REMOVE_ACTIVE_WORKSPACE';
  const { deleteWorkspace } = useWorkspaces();
  const { wsName } = useWorkspacePath();

  const onExecute = useCallback(
    async (item) => {
      await deleteWorkspace(wsName);
      return true;
    },
    [deleteWorkspace, wsName],
  );

  return queryMatch({
    uid,
    title: 'Workspace: Remove active workspace',
    onExecute,
  });
}

export function useDeleteActiveFile() {
  const uid = 'DELETE_ACTIVE_FILE';
  const deleteFile = useDeleteFile();
  const { wsPath, filePath } = useWorkspacePath();

  const onExecute = useCallback(async () => {
    await deleteFile(wsPath);
    return true;
  }, [deleteFile, wsPath]);

  return queryMatch({
    uid,
    hidden: !Boolean(filePath),
    title: `Workspace: Delete current file '${filePath}'`,
    onExecute,
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
