import { T } from '@bangle.io/mini-zod';
import type { Command } from '@bangle.io/types';
import { narrow } from './common';

// Workspace Commands
export const wsCommands = narrow([
  {
    id: 'command::ws:create-note',
    title: 'New Note',
    omniSearch: false,
    dependencies: { services: ['workspaceOps'] },
    args: {
      wsPath: T.String,
    },
  },
  {
    id: 'command::ws:new-note-from-input',
    title: 'New Note',
    omniSearch: false,
    dependencies: {
      services: ['workspaceState', 'fileSystem', 'navigation'],
    },
    args: {
      inputPath: T.String,
    },
  },
  {
    id: 'command::ws:go-workspace',
    title: 'Go to Workspace',
    omniSearch: false,
    dependencies: { services: ['navigation'] },
    args: {
      wsName: T.String,
    },
  },
  {
    id: 'command::ws:go-ws-path',
    title: 'Go to wsPath',
    omniSearch: false,
    dependencies: {
      services: ['navigation'],
    },
    args: {
      wsPath: T.String,
    },
  },
  {
    id: 'command::ws:delete-workspace',
    title: 'Delete Workspace',
    omniSearch: false,
    dependencies: { services: ['workspaceOps', 'navigation'] },
    args: {
      wsName: T.String,
    },
  },
  {
    id: 'command::ws:delete-ws-path',
    title: 'Delete Note',
    omniSearch: false,
    dependencies: { services: ['fileSystem', 'navigation'] },
    args: {
      wsPath: T.String,
    },
  },
  {
    id: 'command::ws:rename-ws-path',
    title: 'Rename Note',
    omniSearch: false,
    dependencies: { services: ['fileSystem', 'navigation'] },
    args: {
      wsPath: T.String,
      newWsPath: T.String,
    },
  },
]);
