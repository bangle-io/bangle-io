import { T } from '@bangle.io/mini-zod';
import type { Command } from '@bangle.io/types';

// Workspace Commands
export const wsCommands = [
  {
    id: 'command::ws:new-note-from-input',
    title: 'New Note',
    omniSearch: false,
    services: ['workspaceOps', 'fileSystem', 'navigation'],
    args: {
      inputPath: T.String,
    },
  },
  {
    id: 'command::ws:go-workspace',
    title: 'Go to Workspace',
    omniSearch: false,
    services: ['navigation'],
    args: {
      wsName: T.String,
    },
  },
  {
    id: 'command::ws:go-ws-path',
    title: 'Go to wsPath',
    omniSearch: false,
    services: ['navigation'],
    args: {
      wsPath: T.String,
    },
  },
] as const satisfies Command[];
