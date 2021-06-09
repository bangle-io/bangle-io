import React, {
  useRef,
  useCallback,
  useContext,
  useState,
  useEffect,
} from 'react';
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
} from '@bangle.dev/core/components/list-item/list-item';
import {
  convertToParagraph,
  insertEmptyParagraphAbove,
  insertEmptyParagraphBelow,
  defaultKeys as paragraphKeys,
} from '@bangle.dev/core/components/paragraph';
import {
  isValidNoteWsPath,
  renameFile,
  useWorkspacePath,
  useWorkspaces,
} from 'workspace/index';
import {
  useCloneWorkspaceCmd,
  useNewNoteCmd,
  useNewWorkspace,
} from 'commands/index';
import {
  COMMAND_PALETTE,
  INPUT_PALETTE,
  PaletteTypeBase,
} from '../paletteTypes';
import { keybindings, keyDisplayValue } from 'config/index';
import {
  PaletteInfo,
  PaletteInfoItem,
  PaletteInput,
  PaletteItemsContainer,
  SidebarRow,
  TerminalIcon,
  usePaletteProps,
} from 'ui-components/index';
import { pickADirectory } from 'baby-fs/index';
import { WorkspaceError } from 'workspace/errors';
import { useDestroyRef, useKeybindings, BaseError } from 'utils/index';
import { EditorManagerContext } from 'editor-manager-context/index';
import { useDispatchPrimaryEditor } from '../use-dispatch-primary-editor';
import { addBoldToTitle } from '../utils';
import { useWorkspaceHooksContext } from 'workspace-hooks/index';

const LOG = false;

let log = LOG ? console.log.bind(console, 'play/command-palette') : () => {};
const addDisabledToTitle = (title, disabled) =>
  title + (disabled ? ' (🚫 not allowed)' : '');

export class CommandPalette extends PaletteTypeBase {
  static type = COMMAND_PALETTE;
  static identifierPrefix = '>';
  static description = 'Run a command';
  static UIComponent = CommandPaletteUIComponent;
  static keybinding = keybindings.toggleCommandPalette.key;
  static placeholder = 'Type a command name and press enter to run';
}

const ActivePalette = CommandPalette;

function CommandPaletteUIComponent({
  dismissPalette,
  query,
  updatePalette,
  updateRawInputValue,
  rawInputValue,
}) {
  const [error, updateError] = useState();

  const destroyedRef = useDestroyRef();

  useEffect(() => {
    updateError(undefined);
  }, [query]);

  let items = [
    useToggleTheme({ dismissPalette }),
    useToggleSidebar({ dismissPalette }),
    useNewNote({ updatePalette, dismissPalette }),
    useRemoveActiveWorkspace({ dismissPalette }),
    useNewWorkspacePalette(),
    useImportWSFromGithub({ updatePalette, dismissPalette }),
    useRenameActiveNote({ updatePalette, dismissPalette }),
    useSaveGithubToken({ updatePalette, dismissPalette }),
    useDeleteActiveNote({ dismissPalette }),
    usePrimaryEditorCommands({ dismissPalette }),
    useCloneWorkspace({ updatePalette, dismissPalette }),
  ];

  const resolvedItems = resolvePaletteItems(
    items,
    query,
    ActivePalette.type,
  ).map((item) => ({
    ...item,
    title: addBoldToTitle(item.title, query),
    onExecute: (...args) => {
      if (item.disabled) {
        return Promise.resolve();
      }
      return Promise.resolve(item.onExecute(...args))
        .then((r) => {
          if (!destroyedRef.current) {
            updateError(undefined);
          }
          return r;
        })
        .catch((err) => {
          if (!destroyedRef.current) {
            updateError(err);
          }
          throw err;
        });
    },
  }));

  const updateCounterRef = useRef();

  const { getItemProps, inputProps } = usePaletteProps({
    onDismiss: dismissPalette,
    resolvedItems,
    value: rawInputValue,
    updateValue: updateRawInputValue,
    updateCounterRef,
  });

  useKeybindings(() => {
    return {
      [ActivePalette.keybinding]: () => {
        updateError(undefined);
        updateCounterRef.current?.((counter) => {
          return counter + 1;
        });
      },
    };
  }, []);

  return (
    <>
      <PaletteInput
        placeholder={ActivePalette.placeholder}
        ref={useRef()}
        paletteIcon={
          <span className="pr-2 flex items-center">
            <TerminalIcon className="h-5 w-5" />
          </span>
        }
        {...inputProps}
      />
      {error && (
        <SidebarRow
          style={{ backgroundColor: 'var(--error-bg-color)' }}
          title={
            <div className="flex flex-col">
              <span>🤦‍♀️ there was en error</span>
              <span className="ml-3 text-sm">
                {error.displayMessage || error.message}
              </span>
            </div>
          }
        />
      )}
      <PaletteItemsContainer>
        {resolvedItems.map((item, i) => {
          return (
            <SidebarRow
              dataId={item.uid}
              className="palette-row"
              disabled={item.disabled}
              key={item.uid}
              title={item.title}
              rightHoverIcon={item.rightHoverIcon}
              rightIcon={
                <kbd className="whitespace-nowrap">{item.keybinding}</kbd>
              }
              {...getItemProps(item, i)}
            />
          );
        })}
      </PaletteItemsContainer>
      <PaletteInfo>
        <PaletteInfoItem>use:</PaletteInfoItem>
        <PaletteInfoItem>
          <kbd className="font-normal">↑↓</kbd> Navigate
        </PaletteInfoItem>
        <PaletteInfoItem>
          <kbd className="font-normal">Enter</kbd> Execute a command
        </PaletteInfoItem>
      </PaletteInfo>
    </>
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

function useNewNote({}) {
  const uid = 'NEW_NOTE_COMMAND';
  const { wsName } = useWorkspacePath();
  const newNoteCommand = useNewNoteCmd();

  const onExecute = useCallback(() => {
    newNoteCommand();
    return false;
  }, [newNoteCommand]);
  return queryMatch({
    uid,
    hidden: !Boolean(wsName),
    title: 'Workspace: New note',
    onExecute,
  });
}

function useNewWorkspacePalette() {
  const uid = 'NEW_WORKSPACE';
  const createWorkspace = useNewWorkspace();
  const onExecute = useCallback(() => {
    createWorkspace();
  }, [createWorkspace]);

  return queryMatch({
    uid,
    title: 'Workspace: New workspace',
    onExecute,
  });
}

function useCloneWorkspace() {
  const uid = 'CLONE_WORKSPACE_COMMAND';
  const { wsName } = useWorkspacePath();

  return queryMatch({
    uid,
    title: 'Workspace: Clone current workspace',
    onExecute: useCloneWorkspaceCmd(),
    disabled: !wsName,
  });
}

function useRenameActiveNote({ updatePalette }) {
  const uid = 'RENAME_ACTIVE_FILE_COMMAND';
  const { filePath, wsName, wsPath, replaceWsPath } = useWorkspacePath();

  const renameFileCb = useCallback(
    async (newFilePath) => {
      let newWsPath = wsName + ':' + newFilePath;

      if (!isValidNoteWsPath(newWsPath)) {
        newWsPath += '.md';
      }

      await renameFile(wsPath, newWsPath);
      replaceWsPath(newWsPath);
    },
    [wsName, wsPath, replaceWsPath],
  );

  const onExecute = useCallback(
    (item) => {
      updatePalette({
        type: INPUT_PALETTE,
        initialQuery: filePath,
        metadata: {
          paletteInfo: 'You are currently renaming a note',
          onInputConfirm: (query) => {
            if (query) {
              return renameFileCb(query);
            } else {
              return Promise.reject(
                new BaseError(
                  'Invalid input query',
                  undefined,
                  'Filename cannot be empty',
                ),
              );
            }
          },
        },
      });
      return false;
    },
    [updatePalette, filePath, renameFileCb],
  );
  return queryMatch({
    uid,
    title: 'Workspace: Rename file',
    hidden: !isValidNoteWsPath(wsPath),
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
  const { bangleIOContext } = useContext(EditorManagerContext);

  const onExecute = useCallback(async () => {
    updatePalette({
      type: INPUT_PALETTE,
      metadata: {
        placeholder:
          'Enter a Github repos url ex: github.com/sindresorhus/awesome',
        onInputConfirm: async (query) => {
          if (query) {
            return importWorkspaceFromGithub(
              bangleIOContext,
              query,
              'browser',
              {
                token: localStorage.getItem('github_token'),
              },
            );
          }
        },
      },
    });
  }, [importWorkspaceFromGithub, updatePalette, bangleIOContext]);

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
      if (
        window.confirm(
          `Are you sure you want to remove "${wsName}"? Removing a workspace does not delete any files inside it.`,
        )
      ) {
        await deleteWorkspace(wsName);
      }
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

export function useDeleteActiveNote({ dismissPalette }) {
  const uid = 'DELETE_ACTIVE_NOTE';
  const { deleteNote } = useWorkspaceHooksContext();
  const { wsPath, filePath } = useWorkspacePath();

  const onExecute = useCallback(async () => {
    if (
      window.confirm(
        `Are you sure you want to remove "${filePath}"? It cannot be undone.`,
      )
    ) {
      await deleteNote(wsPath);
    }
    dismissPalette();
  }, [deleteNote, wsPath, filePath, dismissPalette]);

  return queryMatch({
    uid,
    hidden: !isValidNoteWsPath(wsPath),
    title: `Workspace: Delete current note '${filePath}'`,
    onExecute,
  });
}

function usePrimaryEditorCommands({ dismissPalette }) {
  const executeEditorCommand = useDispatchPrimaryEditor(false);
  const dryExecuteEditorCommand = useDispatchPrimaryEditor(true);

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
    // TODO remove paletteType its redundant
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
