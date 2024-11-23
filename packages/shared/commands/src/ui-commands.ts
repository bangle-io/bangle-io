import { T } from '@bangle.io/mini-zod';
import type { Command } from '@bangle.io/types';

export const uiCommands = [
  {
    id: 'command::ui:toggle-sidebar',
    keywords: ['toggle', 'sidebar'],
    services: ['database'],
    omniSearch: true,
    args: null,
  },
  {
    id: 'command::ui:toggle-omni-search',
    keywords: ['toggle', 'sidebar'],
    services: ['errorService'],
    omniSearch: true,
    args: null,
  },
  {
    id: 'command::ui:create-new-workspace',
    keywords: ['new', 'create', 'workspace'],
    services: ['workspace'],
    omniSearch: true,
    args: {
      workspaceType: T.String,
      wsName: T.String,
    },
  },
] as const satisfies Command[];
