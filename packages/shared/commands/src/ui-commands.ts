import { KEYBOARD_SHORTCUTS } from '@bangle.io/constants';
import { T } from '@bangle.io/mini-zod';
import type { Command } from '@bangle.io/types';
import { narrow } from './common';

export const uiCommands = narrow([
  {
    id: 'command::ui:test-no-use',
    disabled: true,
    keywords: ['new', 'create', 'workspace'],
    dependencies: {
      services: ['workspaceOps'],
      commands: ['command::ui:delete-ws-path-dialog', 'command::ws:new-note'],
    },
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
    dependencies: {
      services: ['workbenchState'],
    },
    omniSearch: true,
    keybindings: ['meta', '\\'],
    args: null,
  },
  {
    id: 'command::ui:toggle-omni-search',
    dependencies: { services: ['workbenchState'] },
    keybindings: [...KEYBOARD_SHORTCUTS.toggleOmniSearch.keys],
    args: null,
  },
  {
    id: 'command::ui:new-workspace-dialog',
    title: 'New Workspace',
    keywords: ['new', 'create', 'workspace'],
    dependencies: { services: ['workbenchState'] },
    omniSearch: true,
    args: null,
  },
  {
    id: 'command::ui:new-note-dialog',
    title: 'New Note',
    keywords: ['new', 'create', 'note'],
    dependencies: { services: ['workbenchState'] },
    omniSearch: true,
    args: null,
  },
  {
    id: 'command::ws:new-note',
    title: 'New Note',
    omniSearch: false,
    dependencies: { services: ['workspaceOps'] },
    args: {
      wsPath: T.String,
    },
  },
  {
    id: 'command::ui:delete-ws-path-dialog',
    title: 'Delete Note',
    omniSearch: true,
    keywords: ['delete', 'note'],
    dependencies: {
      services: ['workbenchState', 'workspaceState'],
      commands: ['command::ws:delete-ws-path'],
    },
    args: {
      wsPath: T.Optional(T.String),
    },
  },
  {
    id: 'command::ui:switch-workspace-dialog',
    title: 'Switch Workspace',
    keywords: ['switch', 'workspace'],
    dependencies: {
      services: ['workbenchState', 'workspaceState', 'navigation'],
    },
    omniSearch: true,
    args: null,
  },
  {
    id: 'command::ui:change-theme-pref-dialog',
    title: 'Switch theme',
    omniSearch: true,
    keywords: ['theme'],
    dependencies: { services: ['workbenchState'] },
    args: {},
  },
  {
    id: 'command::ui:delete-workspace-dialog',
    title: 'Delete Workspace',
    keywords: ['delete', 'workspace'],
    dependencies: {
      services: ['workbenchState', 'workspaceState'],
      commands: ['command::ws:delete-workspace'],
    },
    omniSearch: true,
    args: null,
  },
]);
