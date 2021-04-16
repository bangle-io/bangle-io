import React, { useCallback, useContext } from 'react';
import { UIManagerContext } from 'ui-context/index';
import {
  toggleHeadingCollapse,
  uncollapseAllHeadings,
  defaultKeys as headingKeys,
} from '@bangle.dev/core/components/heading';
import {
  toggleBulletList,
  toggleTodoList,
  defaultKeys as bulletListKeys,
} from '@bangle.dev/core/components/bullet-list';
import {
  moveListItemUp,
  moveListItemDown,
  defaultKeys as listItemKeys,
} from '@bangle.dev/core/components/list-item';
import {
  convertToParagraph,
  insertEmptyParagraphAbove,
  insertEmptyParagraphBelow,
  defaultKeys as paragraphKeys,
} from '@bangle.dev/core/components/paragraph';
import {
  useDeleteFile,
  useRenameActiveFile,
  useWorkspacePath,
  useWorkspaces,
} from 'workspace/index';
import {
  useDispatchPrimaryEditorCommand,
  useInputPaletteNewFileCommand,
} from '../Commands';
import {
  COMMAND_PALETTE,
  INPUT_PALETTE,
  PaletteTypeBase,
} from '../paletteTypes';
import { keybindings, keyDisplayValue } from 'config/index';
import { PaletteUI, TerminalIcon } from 'ui-components';
import { addBoldToTitle } from '../utils';
import { pickADirectory } from 'baby-fs';
import { WorkspaceError } from 'workspace/errors';
const LOG = false;

let log = LOG ? console.log.bind(console, 'play/command-palette') : () => {};
const addDisabledToTitle = (title, disabled) =>
  title + (disabled ? ' (🚫 not allowed)' : '');

export class CommandPalette extends PaletteTypeBase {
  static type = COMMAND_PALETTE;
  static identifierPrefix = '>';
  static description = 'Run a command';
  static PaletteIcon = TerminalIcon;
  static UIComponent = CommandPaletteUIComponent;
  static keybinding = keybindings.toggleCommandPalette.key;
  static placeholder = 'Type a command name and press enter to run';
}

function CommandPaletteUIComponent({
  dismissPalette,
  query,
  updatePalette,
  paletteProps,
}) {
  const items = [
    useToggleTheme({ dismissPalette }),
    useToggleSidebar({ dismissPalette }),
    useNewFile({ updatePalette, dismissPalette }),
    useRemoveActiveWorkspace({ dismissPalette }),
    useNewBrowserWS({ updatePalette, dismissPalette }),
    useNewFileSystemWS({ dismissPalette }),
    useImportWSFromGithub({ updatePalette, dismissPalette }),
    useRenameFile({ updatePalette, dismissPalette }),
    useSaveGithubToken({ updatePalette, dismissPalette }),
    useDeleteActiveFile({ dismissPalette }),
    usePrimaryEditorCommands({ dismissPalette }),
  ];

  return (
    <PaletteUI
      items={resolvePaletteItems(items, query, CommandPalette.type).map(
        (item) => ({
          ...item,
          title: addBoldToTitle(item.title, query),
        }),
      )}
      {...paletteProps}
    />
  );
}

function resolvePaletteItems(items, query, paletteType) {
  const _p = (items, query, paletteType) => {
    return items
      .flatMap((item) => {
        if (typeof item === 'function') {
          item = item({ paletteType, query });
        }
        if (Array.isArray(item)) {
          return _p(item, query, paletteType);
        }

        return item;
      })
      .filter(Boolean);
  };

  return _p(items, query, paletteType);
}

function useToggleTheme({ dismissPalette }) {
  const { dispatch } = useContext(UIManagerContext);
  const uid = 'TOGGLE_THEME_COMMAND';
  const onExecute = useCallback(() => {
    dispatch({
      type: 'UI/TOGGLE_THEME',
    });
    dismissPalette();
  }, [dispatch, dismissPalette]);

  return queryMatch({
    uid,
    title: 'View: Toggle theme',
    onExecute,
  });
}

function useToggleSidebar({ dismissPalette }) {
  const { dispatch } = useContext(UIManagerContext);
  const uid = 'TOGGLE_FILE_SIDEBAR_COMMAND';
  const onExecute = useCallback(() => {
    dispatch({
      type: 'UI/TOGGLE_SIDEBAR',
      value: { type: 'file-browser' },
    });
    dismissPalette();
  }, [dispatch, dismissPalette]);

  return queryMatch({
    uid,
    title: 'View: Toggle file sidebar',
    onExecute,
  });
}

function useNewFile({}) {
  const uid = 'NEW_FILE_COMMAND';
  const newFileCommand = useInputPaletteNewFileCommand();

  const onExecute = useCallback(() => {
    newFileCommand();
    return false;
  }, [newFileCommand]);
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
        placeholder: 'Please give your workspace a name',
        onInputConfirm: (query) => {
          if (query) {
            return createWorkspace(query, 'browser');
          }
        },
      },
    });
  }, [updatePalette, createWorkspace]);

  return queryMatch({
    uid,
    title: 'Workspace: New workspace saved in your browser storage',
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

function useNewFileSystemWS({ dismissPalette }) {
  const uid = 'NEW_FS_WS_COMMAND';

  const { createWorkspace, switchWorkspace } = useWorkspaces();

  const onExecute = useCallback(async () => {
    const rootDirHandle = await pickADirectory();
    try {
      await createWorkspace(rootDirHandle.name, 'nativefs', { rootDirHandle });
    } catch (error) {
      if (
        error instanceof WorkspaceError &&
        error.message.endsWith('as it already exists')
      ) {
        await switchWorkspace(rootDirHandle.name);
      } else {
        throw error;
      }
    }
    dismissPalette();
  }, [createWorkspace, switchWorkspace, dismissPalette]);

  return queryMatch({
    uid,
    title: 'Workspace: Open a workspace in your file system',
    onExecute,
    hidden: !Boolean(window.showDirectoryPicker),
  });
}

function useImportWSFromGithub({ updatePalette }) {
  const uid = 'IMPORT_WS_FROM_GITHUB';
  const { importWorkspaceFromGithub } = useWorkspaces();

  const onExecute = useCallback(async () => {
    updatePalette({
      type: INPUT_PALETTE,
      metadata: {
        placeholder:
          'Enter a Github repos url ex: github.com/sindresorhus/awesome',
        onInputConfirm: async (query) => {
          if (query) {
            return importWorkspaceFromGithub(query, 'browser', {
              token: localStorage.getItem('github_token'),
            });
          }
        },
      },
    });
  }, [importWorkspaceFromGithub, updatePalette]);

  return queryMatch({
    uid,
    title: 'Workspace: Import workspace from a Github URL',
    onExecute,
  });
}

function useSaveGithubToken({ updatePalette }) {
  const uid = 'SAVE_GITHUB_TOKEN';

  const onExecute = useCallback(async () => {
    updatePalette({
      type: INPUT_PALETTE,
      metadata: {
        placeholder:
          'Enter your personal Github token this will be saved in your browser',
        onInputConfirm: async (query) => {
          window.localStorage.setItem('github_token', query);
        },
      },
    });
  }, [updatePalette]);

  return queryMatch({
    uid,
    title: 'Workspace: Save personal Github token',
    onExecute,
  });
}

export function useRemoveActiveWorkspace({ dismissPalette }) {
  const uid = 'REMOVE_ACTIVE_WORKSPACE';
  const { deleteWorkspace } = useWorkspaces();
  const { wsName } = useWorkspacePath();

  const onExecute = useCallback(
    async (item) => {
      await deleteWorkspace(wsName);
      dismissPalette();
    },
    [deleteWorkspace, dismissPalette, wsName],
  );

  return queryMatch({
    uid,
    title: 'Workspace: Remove active workspace',
    onExecute,
  });
}

export function useDeleteActiveFile({ dismissPalette }) {
  const uid = 'DELETE_ACTIVE_FILE';
  const deleteFile = useDeleteFile();
  const { wsPath, filePath } = useWorkspacePath();

  const onExecute = useCallback(async () => {
    await deleteFile(wsPath);
    dismissPalette();
  }, [deleteFile, wsPath, dismissPalette]);

  return queryMatch({
    uid,
    hidden: !Boolean(filePath),
    title: `Workspace: Delete current file '${filePath}'`,
    onExecute,
  });
}

function usePrimaryEditorCommands({ dismissPalette }) {
  const executeEditorCommand = useDispatchPrimaryEditorCommand(false);
  const dryExecuteEditorCommand = useDispatchPrimaryEditorCommand(true);

  return ({ query, paletteType }) => {
    const commands = [];
    const toggleHeadingCollapseDisabled = !dryExecuteEditorCommand(
      toggleHeadingCollapse,
    );
    commands.push({
      uid: 'toggleHeadingCollapse',
      title: addDisabledToTitle(
        'Editor: Collapse/uncollapse current heading',
        toggleHeadingCollapseDisabled,
      ),
      disabled: toggleHeadingCollapseDisabled,
      onExecute: () => {
        executeEditorCommand(toggleHeadingCollapse);
        dismissPalette();
      },
    });

    commands.push({
      uid: 'uncollapseAllHeadings',
      title: 'Editor: Uncollapse all headings',
      onExecute: () => {
        executeEditorCommand(uncollapseAllHeadings);
        dismissPalette();
      },
    });

    commands.push({
      uid: 'convertToParagraph',
      title: addDisabledToTitle(
        'Editor: Convert to paragraph',
        !dryExecuteEditorCommand(convertToParagraph),
      ),
      keybinding: keyDisplayValue(paragraphKeys.convertToParagraph),
      disabled: !dryExecuteEditorCommand(convertToParagraph),
      onExecute: () => {
        executeEditorCommand(convertToParagraph);
        dismissPalette();
      },
    });

    commands.push({
      uid: 'insertParagraphAbove',
      title: addDisabledToTitle(
        'Editor: Insert an empty paragraph above',
        !dryExecuteEditorCommand(insertEmptyParagraphAbove),
      ),
      keybinding: keyDisplayValue(paragraphKeys.insertEmptyParaAbove),
      disabled: !dryExecuteEditorCommand(insertEmptyParagraphAbove),
      onExecute: () => {
        executeEditorCommand(insertEmptyParagraphAbove);
        dismissPalette();
      },
    });

    commands.push({
      uid: 'insertParagraphBelow',
      title: addDisabledToTitle(
        'Editor: Insert an empty paragraph below',
        !dryExecuteEditorCommand(insertEmptyParagraphBelow),
      ),
      keybinding: keyDisplayValue(paragraphKeys.insertEmptyParaBelow),
      disabled: !dryExecuteEditorCommand(insertEmptyParagraphBelow),
      onExecute: () => {
        executeEditorCommand(insertEmptyParagraphBelow);
        dismissPalette();
      },
    });

    commands.push({
      uid: 'toggleBulletList',
      title: 'Editor: Convert to a bullet list',
      keybinding: keyDisplayValue(bulletListKeys.toggle),
      // TODO the dry runninng of list commands is broken
      onExecute: () => {
        executeEditorCommand(toggleBulletList);
        dismissPalette();
      },
    });

    commands.push({
      uid: 'toggleTodoList',
      title: 'Editor: Convert to a todo list',
      keybinding: keyDisplayValue(bulletListKeys.toggleTodo),
      onExecute: () => {
        executeEditorCommand(toggleTodoList);
        dismissPalette();
      },
    });

    commands.push({
      uid: 'moveListItemUp',
      title: addDisabledToTitle(
        'Editor: Move to list item up',
        !dryExecuteEditorCommand(moveListItemUp),
      ),
      keybinding: keyDisplayValue(listItemKeys.moveUp),
      disabled: !dryExecuteEditorCommand(moveListItemUp),
      onExecute: () => {
        executeEditorCommand(moveListItemUp);
        dismissPalette();
      },
    });

    commands.push({
      uid: 'moveListItemDown',
      title: addDisabledToTitle(
        'Editor: Move to list item down',
        !dryExecuteEditorCommand(moveListItemDown),
      ),
      disabled: !dryExecuteEditorCommand(moveListItemDown),
      keybinding: keyDisplayValue(listItemKeys.moveDown),
      onExecute: () => {
        executeEditorCommand(moveListItemDown);
        dismissPalette();
      },
    });

    return commands
      .filter((item) => queryMatch(item)({ query, paletteType }))
      .sort((a, b) => {
        if (a.disabled) {
          return 1;
        }
        if (b.disabled) {
          return -1;
        }
        return 0;
      });
  };
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
