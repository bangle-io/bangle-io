import { KEYBOARD_SHORTCUTS } from '@bangle.io/constants';
import { T } from '@bangle.io/mini-zod';
import type { Command } from '@bangle.io/types';

export const uiCommands = [
  {
    id: 'command::ui:test-no-use',
    disabled: true,
    keywords: ['new', 'create', 'workspace'],
    services: ['workspace'],
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
    services: [],
    omniSearch: true,
    keybindings: ['meta', '\\'],
    args: null,
  },
  {
    id: 'command::ui:toggle-omni-search',
    services: [],
    keybindings: [...KEYBOARD_SHORTCUTS.toggleOmniSearch.keys],
    args: null,
  },
  {
    id: 'command::ui:new-workspace-dialog',
    title: 'New Workspace',
    keywords: ['new', 'create', 'workspace'],
    services: ['workspace'],
    omniSearch: true,
    args: null,
  },
  {
    id: 'command::ui:new-note-dialog',
    title: 'New Note',
    keywords: ['new', 'create', 'note'],
    services: [],
    omniSearch: true,
    args: null,
  },
  {
    id: 'command::ws:new-note',
    title: 'New Note',
    omniSearch: false,
    services: ['workspace'],
    args: {
      wsPath: T.String,
    },
  },
] as const satisfies Command[];
