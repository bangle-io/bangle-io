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
  const onPressEnter = useCallback(() => {
    dispatch({
      type: 'UI/TOGGLE_THEME',
    });
  }, [dispatch]);

  return queryMatch({
    uid,
    title: 'View: Toggle theme',
    onPressEnter,
    onClick: onPressEnter,
  });
}

function useToggleSidebar() {
  const { dispatch } = useContext(UIManagerContext);
  const uid = 'TOGGLE_SIDEBAR_COMMAND';
  const onPressEnter = useCallback(() => {
    dispatch({
      type: 'UI/TOGGLE_SIDEBAR',
    });
  }, [dispatch]);

  return queryMatch({
    uid,
    title: 'View: Toggle sidebar',
    onPressEnter,
    onClick: onPressEnter,
  });
}

function useNewFile({ updatePalette }) {
  const uid = 'NEW_FILE_COMMAND';
  const createNewFile = useCreateMdFile();
  const { wsName } = useWorkspacePath();

  const onPressEnter = useCallback(() => {
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
    onPressEnter,
    onClick: onPressEnter,
  });
}

function useNewBrowserWS({ updatePalette }) {
  const uid = 'NEW_BROWSER_WS_COMMAND';

  const { createWorkspace } = useWorkspaces();

  const onPressEnter = useCallback(() => {
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
    onPressEnter,
    onClick: onPressEnter,
  });
}

function useRenameFile({ updatePalette }) {
  const uid = 'RENAME_FILE_COMMAND';
  const { filePath } = useWorkspacePath();

  const renameActiveFile = useRenameActiveFile();

  const onPressEnter = useCallback(
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
    onPressEnter,
    onClick: onPressEnter,
  });
}

function useNewFileSystemWS() {
  const uid = 'NEW_FS_WS_COMMAND';

  const { createWorkspace } = useWorkspaces();

  const onPressEnter = useCallback(async () => {
    const rootDirHandle = await pickADirectory();
    await createWorkspace(rootDirHandle.name, 'nativefs', { rootDirHandle });
  }, [createWorkspace]);

  return queryMatch({
    uid,
    title: 'Workspace: New workspace in filesystem',
    onPressEnter,
    onClick: onPressEnter,
  });
}

export function useDeleteActiveWorkspace() {
  const uid = 'DELETE_ACTIVE_WORKSPACE';
  const { deleteWorkspace } = useWorkspaces();
  const { wsName } = useWorkspacePath();

  const onPressEnter = useCallback(
    (item) => {
      deleteWorkspace(wsName);
    },
    [deleteWorkspace, wsName],
  );

  return queryMatch({
    uid,
    title: 'Workspace: Delete active workspace',
    onPressEnter,
    onClick: onPressEnter,
  });
}

export function useDeleteActiveFile() {
  const uid = 'DELETE_ACTIVE_FILE';
  const deleteFile = useDeleteFile();
  const { wsPath, filePath } = useWorkspacePath();

  const onPressEnter = useCallback(() => {
    deleteFile(wsPath);
  }, [deleteFile, wsPath]);

  return queryMatch({
    uid,
    hidden: !Boolean(filePath),
    title: `Workspace: Delete current file '${filePath}'`,
    onPressEnter,
    onClick: onPressEnter,
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
