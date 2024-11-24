import { T } from '@bangle.io/mini-zod';
import type { Command } from '@bangle.io/types';

// Workspace Commands
export const wsCommands = [
  {
    id: 'command::ws:new-note-from-input',
    title: 'New Note',
    omniSearch: false,
    services: ['workspace', 'fileSystem', 'navigation'],
    args: {
      inputPath: T.String,
    },
  },
] as const satisfies Command[];
