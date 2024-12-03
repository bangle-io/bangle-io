import { KEYBOARD_SHORTCUTS } from '@bangle.io/constants';
import { T } from '@bangle.io/mini-zod';
import type { Command } from '@bangle.io/types';
import { narrow } from './common';

// pattern command::ui:{action}-{target}
export const uiCommands = narrow([
  // GROUP: TEST
  {
    id: 'command::ui:test-no-use',
    disabled: true,
    keywords: ['new', 'create', 'workspace'],
    dependencies: {
      services: ['workspaceOps'],
      commands: [
        'command::ui:delete-note-dialog',
        'command::ui:create-note-dialog',
        'command::ws:go-workspace',
      ],
    },
    args: {
      workspaceType: T.String,
      wsName: T.String,
    },
  },

  // GROUP: BASIC UI OPERATIONS
  {
    id: 'command::ui:toggle-sidebar',
    title: 'Toggle Sidebar',
    keywords: ['toggle', 'sidebar'],
    dependencies: {
      services: ['workbenchState'],
    },
    omniSearch: true,
    keybindings: ['meta', '\\'],
    args: null,
  },
  {
    id: 'command::ui:toggle-search',
    dependencies: { services: ['workbenchState'] },
    keybindings: [...KEYBOARD_SHORTCUTS.toggleOmniSearch.keys],
    args: null,
  },
  {
    id: 'command::ui:switch-theme',
    title: 'Switch Theme',
    omniSearch: true,
    keywords: ['theme', 'change', 'switch'],
    dependencies: { services: ['workbenchState'] },
    args: {},
  },

  // GROUP: NOTES MANAGEMENT
  {
    id: 'command::ui:create-note-dialog',
    title: 'New Note',
    keywords: ['new', 'create', 'note'],
    dependencies: {
      services: ['workbenchState'],
      commands: ['command::ws:new-note-from-input'],
    },
    omniSearch: true,
    args: {
      prefillName: T.Optional(T.String),
    },
  },
  {
    id: 'command::ui:delete-note-dialog',
    title: 'Delete Note',
    omniSearch: true,
    keywords: ['delete', 'note', 'remove'],
    dependencies: {
      services: ['workbenchState', 'workspaceState'],
      commands: ['command::ws:delete-ws-path'],
    },
    args: {
      wsPath: T.Optional(T.String),
    },
  },
  {
    id: 'command::ui:rename-note-dialog',
    title: 'Rename Note',
    keywords: ['rename', 'note', 'file'],
    dependencies: {
      services: ['workspaceState', 'workbenchState'],
      commands: ['command::ws:rename-ws-path'],
    },
    omniSearch: true,
    args: {
      wsPath: T.Optional(T.String),
    },
  },
  {
    id: 'command::ui:move-note-dialog',
    title: 'Move Note',
    keywords: ['move', 'note', 'relocate'],
    dependencies: {
      services: ['workbenchState', 'workspaceState'],
      commands: ['command::ws:rename-ws-path'],
    },
    omniSearch: true,
    args: {
      wsPath: T.Optional(T.String),
    },
  },
  {
    id: 'command::ui:quick-new-note',
    title: 'Quick New Note',
    keywords: ['new', 'create', 'note', 'quick', 'untitled'],
    dependencies: {
      services: ['workspaceState'],
      commands: ['command::ws:new-note-from-input'],
    },
    omniSearch: true,
    args: null,
  },

  // GROUP: WORKSPACE MANAGEMENT
  {
    id: 'command::ui:create-workspace-dialog',
    title: 'New Workspace',
    keywords: ['new', 'create', 'workspace'],
    dependencies: { services: ['workbenchState'] },
    omniSearch: true,
    args: null,
  },
  {
    id: 'command::ui:switch-workspace',
    title: 'Switch Workspace',
    keywords: ['switch', 'workspace', 'change'],
    dependencies: {
      services: ['workbenchState', 'workspaceState', 'navigation'],
    },
    omniSearch: true,
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
    omniSearch: true,
    args: null,
  },
]);
