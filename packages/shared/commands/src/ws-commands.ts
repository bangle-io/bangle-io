import { T } from '@bangle.io/mini-zod';
import { narrow } from './common';

// Workspace Commands
export const wsCommands = narrow([
  {
    id: 'command::ws:create-note',
    title: 'New Note',
    omniSearch: false,
    dependencies: { services: ['fileSystem', 'navigation'] },
    args: {
      wsPath: T.String,
      // whether to navigate to the newly created note
      navigate: T.Optional(T.Boolean),
    },
  },
  {
    id: 'command::ws:quick-new-note',
    title: 'Quick New Note',
    keywords: ['new', 'create', 'note', 'quick', 'untitled'],
    dependencies: {
      services: ['workspaceState'],
      commands: ['command::ws:new-note-from-input'],
    },
    omniSearch: true,
    args: {
      pathPrefix: T.Optional(T.String),
    },
  },
  {
    id: 'command::ws:new-note-from-input',
    title: 'New Note',
    omniSearch: false,
    dependencies: {
      services: ['workspaceState', 'fileSystem', 'navigation'],
      commands: ['command::ws:create-note'],
    },
    args: {
      inputPath: T.String,
    },
  },

  {
    id: 'command::ws:create-directory',
    title: 'Create Directory',
    omniSearch: false,
    dependencies: {
      services: [],
      commands: ['command::ws:quick-new-note'],
    },
    args: {
      dirWsPath: T.String,
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
  {
    id: 'command::ws:move-ws-path',
    title: 'Move Note',
    omniSearch: false,
    dependencies: {
      services: ['fileSystem', 'navigation', 'workspaceState'],
    },
    args: {
      wsPath: T.String,
      destDirWsPath: T.String,
    },
  },
  {
    id: 'command::ws:go-ws-home',
    title: 'Go to Workspace Home',
    keywords: ['home', 'workspace', 'go'],
    omniSearch: true,
    dependencies: { services: ['navigation'] },
    args: null,
  },
  {
    id: 'command::ws:clone-note',
    title: 'Clone Note',
    omniSearch: true,
    keywords: ['clone', 'duplicate', 'copy'],
    dependencies: { services: ['workspaceState', 'fileSystem', 'navigation'] },
    args: null,
  },
]);
