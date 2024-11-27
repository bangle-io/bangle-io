import { KEYBOARD_SHORTCUTS } from '@bangle.io/constants';
import { T } from '@bangle.io/mini-zod';
import type { Command } from '@bangle.io/types';

export const uiCommands = [
  {
    id: 'command::ui:test-no-use',
    disabled: true,
    keywords: ['new', 'create', 'workspace'],
    services: ['workspaceOps'],
    args: {
      workspaceType: T.String,
      wsName: T.String,
    },
  },
  // UI Commands
  {
    id: 'command::ui:toggle-sidebar',
    title: 'Toggle Sidebar',
    keywords: ['toggle', 'sidebar'],
    services: ['workbenchState'],
    omniSearch: true,
    keybindings: ['meta', '\\'],
    args: null,
  },
  {
    id: 'command::ui:toggle-omni-search',
    services: ['workbenchState'],
    keybindings: [...KEYBOARD_SHORTCUTS.toggleOmniSearch.keys],
    args: null,
  },
  {
    id: 'command::ui:new-workspace-dialog',
    title: 'New Workspace',
    keywords: ['new', 'create', 'workspace'],
    services: ['workbenchState'],
    omniSearch: true,
    args: null,
  },
  {
    id: 'command::ui:new-note-dialog',
    title: 'New Note',
    keywords: ['new', 'create', 'note'],
    services: ['workbenchState'],
    omniSearch: true,
    args: null,
  },
  {
    id: 'command::ws:new-note',
    title: 'New Note',
    omniSearch: false,
    services: ['workspaceOps'],
    args: {
      wsPath: T.String,
    },
  },
  {
    id: 'command::ui:delete-ws-path-dialog',
    title: 'Delete Note',
    omniSearch: true,
    keywords: ['delete', 'note'],
    services: ['workbenchState', 'workspaceState', 'fileSystem'],
    args: {
      wsPath: T.Optional(T.String),
    },
  },

  {
    id: 'command::ui:change-theme-pref-dialog',
    title: 'Switch theme',
    omniSearch: true,
    keywords: ['theme'],
    services: ['workbenchState'],
    args: {},
  },
] as const satisfies Command[];
