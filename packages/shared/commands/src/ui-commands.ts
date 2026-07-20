import {
  KEYBOARD_SHORTCUTS,
  SETTINGS_DEFAULT_COMMAND,
  SETTINGS_PAGE_DEFINITIONS,
} from '@bangle.io/constants';
import { T } from '@bangle.io/mini-js-utils';
import { narrow } from './common';

// Each settings page exposes an omni-search command. The list is small and
// stable, so the commands are written inline (rather than generated) to keep
// per-command literal types flowing into `BangleAppCommand` without a cast.
// The `command.spec` test asserts these stay in sync with SETTINGS_PAGE_DEFINITIONS.
const [GENERAL_SETTINGS_PAGE, WORKSPACES_SETTINGS_PAGE] =
  SETTINGS_PAGE_DEFINITIONS;

// pattern command::ui:{action}-{target}
export const uiCommands = narrow([
  // GROUP: BASIC UI OPERATIONS
  {
    id: 'command::ui:toggle-sidebar',
    title: 'Toggle Sidebar',
    keywords: ['toggle', 'sidebar'],
    dependencies: {
      services: ['workbenchState'],
    },
    omniSearch: 'global',
    keybindings: ['ctrl', '\\'],
    args: null,
  },
  {
    id: 'command::ui:reload-app',
    title: 'Reload App',
    keywords: ['reload', 'refresh', 'restart'],
    dependencies: {
      services: ['workbenchState'],
    },
    omniSearch: 'global',
    args: null,
  },
  {
    id: 'command::ui:toggle-omni-search',
    dependencies: { services: ['workbenchState'] },
    keybindings: [...KEYBOARD_SHORTCUTS.toggleOmniSearch.keys],
    allowShortcutInInputs: true,
    args: {
      prefill: T.Optional(T.String),
    },
  },
  {
    id: 'command::ui:switch-theme',
    title: 'Switch Theme',
    omniSearch: 'global',
    keywords: ['theme', 'change', 'switch'],
    dependencies: {
      services: ['workbenchState'],
      commands: ['command::ui:focus-editor'],
    },
    autoFocusEditor: false,
    args: {},
  },
  {
    id: 'command::ui:switch-editor-engine',
    title: 'Switch Editor Engine',
    omniSearch: 'global',
    keywords: [
      'editor',
      'engine',
      'switch',
      'wordgard',
      'prosemirror',
      'experimental',
    ],
    dependencies: {
      services: ['workbenchState', 'editorEngine'],
    },
    autoFocusEditor: false,
    args: null,
  },
  {
    id: SETTINGS_DEFAULT_COMMAND.id,
    title: SETTINGS_DEFAULT_COMMAND.title,
    keywords: [...SETTINGS_DEFAULT_COMMAND.keywords],
    omniSearch: 'global',
    dependencies: {
      services: ['navigation'],
    },
    autoFocusEditor: false,
    args: null,
  },
  {
    id: GENERAL_SETTINGS_PAGE.commandId,
    title: GENERAL_SETTINGS_PAGE.commandTitle,
    keywords: [...GENERAL_SETTINGS_PAGE.commandKeywords],
    omniSearch: 'global',
    dependencies: {
      services: ['navigation'],
    },
    autoFocusEditor: false,
    args: null,
  },
  {
    id: WORKSPACES_SETTINGS_PAGE.commandId,
    title: WORKSPACES_SETTINGS_PAGE.commandTitle,
    keywords: [...WORKSPACES_SETTINGS_PAGE.commandKeywords],
    omniSearch: 'global',
    dependencies: {
      services: ['navigation'],
    },
    autoFocusEditor: false,
    args: null,
  },

  // GROUP: NOTES MANAGEMENT
  {
    id: 'command::ui:create-note-dialog',
    title: 'New Note',
    keywords: ['new', 'create', 'note'],
    dependencies: {
      services: ['workbenchState'],
      commands: ['command::ws:new-note-from-input', 'command::ui:focus-editor'],
    },
    omniSearch: 'workspace',
    autoFocusEditor: false,
    args: {
      prefillName: T.Optional(T.String),
    },
  },
  {
    id: 'command::ui:delete-note-dialog',
    title: 'Delete Note',
    omniSearch: 'note',
    keywords: ['delete', 'note', 'remove'],
    dependencies: {
      services: ['workbenchState', 'workspaceState'],
      commands: ['command::ws:delete-ws-path', 'command::ui:focus-editor'],
    },
    autoFocusEditor: false,
    args: {
      wsPath: T.Optional(T.String),
    },
  },
  {
    id: 'command::ui:delete-file-dialog',
    title: 'Delete File',
    keywords: ['delete', 'file', 'remove'],
    dependencies: {
      services: ['workbenchState', 'workspaceState'],
      commands: ['command::ws:delete-ws-path', 'command::ui:focus-editor'],
    },
    autoFocusEditor: false,
    args: {
      wsPath: T.String,
    },
  },
  {
    id: 'command::ui:delete-files-dialog',
    title: 'Delete Files',
    keywords: ['delete', 'files', 'remove'],
    dependencies: {
      services: ['workbenchState'],
      commands: ['command::ws:delete-ws-paths', 'command::ui:focus-editor'],
    },
    autoFocusEditor: false,
    args: {
      wsPaths: T.Array(T.String),
    },
  },
  {
    id: 'command::ui:rename-note-dialog',
    title: 'Rename Note',
    keywords: ['rename', 'note', 'file'],
    dependencies: {
      services: ['workspaceState', 'workbenchState'],
      commands: ['command::ws:rename-ws-path', 'command::ui:focus-editor'],
    },
    omniSearch: 'note',
    autoFocusEditor: false,
    args: {
      wsPath: T.Optional(T.String),
    },
  },
  {
    id: 'command::ui:rename-file-dialog',
    title: 'Rename File',
    keywords: ['rename', 'file'],
    dependencies: {
      services: ['workspaceState', 'workbenchState'],
      commands: ['command::ws:rename-ws-path', 'command::ui:focus-editor'],
    },
    autoFocusEditor: false,
    args: {
      wsPath: T.String,
    },
  },
  {
    id: 'command::ui:copy-workspace-path',
    title: 'Copy Path',
    keywords: ['copy', 'path', 'file'],
    dependencies: {
      services: [],
    },
    autoFocusEditor: false,
    args: {
      wsPath: T.String,
    },
  },
  {
    id: 'command::ui:move-note-dialog',
    title: 'Move Note',
    keywords: ['move', 'note', 'relocate'],
    dependencies: {
      services: ['workbenchState', 'workspaceState'],
      commands: [
        'command::ws:move-ws-path',
        'command::ui:focus-editor',
        'command::ui:create-directory-dialog',
      ],
    },
    omniSearch: 'note',
    autoFocusEditor: false,
    args: {
      wsPath: T.Optional(T.String),
    },
  },

  {
    id: 'command::ui:create-directory-dialog',
    title: 'New Folder',
    keywords: ['new', 'create', 'directory', 'folder'],
    dependencies: {
      services: ['workbenchState', 'workspaceState'],
      commands: ['command::ws:create-directory'],
    },
    omniSearch: 'workspace',
    autoFocusEditor: false,
    args: {
      pathPrefix: T.Optional(T.String),
    },
  },
  {
    id: 'command::ui:rename-directory-dialog',
    title: 'Rename Directory',
    keywords: ['rename', 'directory', 'folder'],
    dependencies: {
      services: ['workbenchState'],
      commands: ['command::ws:rename-directory', 'command::ui:focus-editor'],
    },
    autoFocusEditor: false,
    args: {
      dirWsPath: T.String,
    },
  },
  {
    id: 'command::ui:delete-directory-dialog',
    title: 'Delete Directory',
    keywords: ['delete', 'directory', 'folder', 'remove'],
    dependencies: {
      services: ['workbenchState'],
      commands: ['command::ws:delete-directory', 'command::ui:focus-editor'],
    },
    autoFocusEditor: false,
    args: {
      dirWsPath: T.String,
    },
  },

  // GROUP: WORKSPACE MANAGEMENT
  {
    id: 'command::ui:create-workspace-dialog',
    title: 'New Workspace',
    keywords: ['new', 'create', 'workspace'],
    dependencies: { services: ['workbenchState'] },
    omniSearch: 'global',
    autoFocusEditor: false,
    args: null,
  },
  {
    id: 'command::ui:switch-workspace',
    title: 'Switch Workspace',
    keywords: ['switch', 'workspace', 'change'],
    dependencies: {
      services: ['workbenchState', 'workspaceState', 'navigation'],
    },
    omniSearch: 'global',
    args: null,
  },
  {
    id: 'command::ui:delete-workspace-dialog',
    title: 'Delete Workspace',
    keywords: ['delete', 'workspace', 'remove'],
    dependencies: {
      services: ['workbenchState', 'workspaceState'],
      commands: ['command::ws:delete-workspace'],
    },
    omniSearch: 'global',
    autoFocusEditor: false,
    args: null,
  },
  {
    id: 'command::ui:native-fs-auth',
    dependencies: {
      services: [
        'workspaceOps',
        'navigation',
        'workbenchState',
        'editorService',
      ],
    },
    autoFocusEditor: false,
    args: {
      wsName: T.String,
    },
    omniSearch: false,
  },
  {
    id: 'command::ui:reconnect-native-fs-workspace',
    dependencies: {
      services: ['workspaceOps', 'workbenchState'],
    },
    autoFocusEditor: false,
    args: {
      wsName: T.String,
    },
    omniSearch: false,
  },
  {
    // Reveal-only: anchors the OS directory picker at the workspace's stored
    // handle so the dialog shows its on-disk path. Unlike the reconnect
    // command above it never rebinds the handle or mutates metadata.
    id: 'command::ui:locate-native-fs-workspace',
    dependencies: {
      services: ['workspaceOps'],
    },
    autoFocusEditor: false,
    args: {
      wsName: T.String,
    },
    omniSearch: false,
  },
  {
    id: 'command::ui:toggle-all-files',
    title: 'View All Files',
    keywords: ['files', 'list', 'browse', 'all'],
    dependencies: { services: ['workbenchState'] },
    omniSearch: 'workspace',
    autoFocusEditor: false,
    args: {
      prefillInput: T.Optional(T.String),
    },
  },

  {
    id: 'command::ui:toggle-wide-editor',
    title: 'Toggle Wide Editor',
    keywords: ['toggle', 'wide', 'editor'],
    dependencies: {
      services: ['workbenchState', 'workspaceState'],
    },
    omniSearch: 'note',
    args: null,
  },

  {
    id: 'command::ui:focus-editor',
    title: 'Focus Editor',
    keywords: ['focus', 'editor', 'cursor'],
    dependencies: {
      services: ['workbenchState', 'workspaceState', 'editorEngine'],
    },
    omniSearch: 'note',
    args: null,
  },

  {
    id: 'command::ui:copy-selection-as-markdown',
    title: 'Copy Selection as Markdown',
    keywords: ['copy', 'markdown', 'selection', 'text'],
    dependencies: {
      services: ['editorEngine'],
    },
    omniSearch: 'note',
    autoFocusEditor: false,
    args: null,
  },

  {
    id: 'command::ui:paste-from-markdown',
    title: 'Paste from Markdown',
    keywords: ['paste', 'markdown', 'insert', 'clipboard'],
    dependencies: {
      services: ['editorEngine'],
    },
    omniSearch: 'note',
    autoFocusEditor: false,
    args: null,
  },

  {
    id: 'command::ui:toggle-heading-collapse',
    title: 'Toggle Collapse Heading Section',
    keywords: ['collapse', 'expand', 'fold', 'heading', 'section'],
    dependencies: {
      services: ['editorEngine'],
    },
    omniSearch: 'note',
    args: null,
  },

  {
    id: 'command::ui:uncollapse-all-headings',
    title: 'Expand All Heading Sections',
    keywords: ['expand', 'uncollapse', 'unfold', 'heading', 'all', 'section'],
    dependencies: {
      services: ['editorEngine'],
    },
    omniSearch: 'note',
    args: null,
  },

  {
    id: 'command::ui:collapse-all-headings-1',
    title: 'Collapse All Heading 1 Sections',
    keywords: ['collapse', 'fold', 'heading', 'h1', 'all', 'section'],
    dependencies: {
      services: ['editorEngine'],
    },
    omniSearch: 'note',
    args: null,
  },

  {
    id: 'command::ui:collapse-all-headings-2',
    title: 'Collapse All Heading 2 Sections',
    keywords: ['collapse', 'fold', 'heading', 'h2', 'all', 'section'],
    dependencies: {
      services: ['editorEngine'],
    },
    omniSearch: 'note',
    args: null,
  },

  {
    id: 'command::ui:collapse-all-headings-3',
    title: 'Collapse All Heading 3 Sections',
    keywords: ['collapse', 'fold', 'heading', 'h3', 'all', 'section'],
    dependencies: {
      services: ['editorEngine'],
    },
    omniSearch: 'note',
    args: null,
  },
]);
