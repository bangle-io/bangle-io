import type { ColorScheme } from '../types';

const LIGHT_SCHEME = 'light' as const;
const DARK_SCHEME = 'dark' as const;

export const COLOR_SCHEME = {
  LIGHT: LIGHT_SCHEME,
  DARK: DARK_SCHEME,
} as const;

export const WIDESCREEN_WIDTH = 759;

export const KEYBOARD_SHORTCUTS = {
  toggleOmniSearch: { id: 'toggleOmniSearch', keys: ['meta', 'k'] },
} as const;

export const WORKSPACE_STORAGE_TYPE = {
  Help: 'helpfs',
  NativeFS: 'nativefs',
  Browser: 'browser',
  PrivateFS: 'privatefs',
  Github: 'github-storage',
  Memory: 'memory',
} as const;

export type WorkspaceStorageType =
  (typeof WORKSPACE_STORAGE_TYPE)[keyof typeof WORKSPACE_STORAGE_TYPE];

// Add all service names here
export const SERVICE_NAME = {
  browserErrorHandlerService: 'browser-error-handler',
  browserLocalStorageSyncDatabaseService: 'browser-local-storage-sync-database',
  browserRouterService: 'browser-router',
  commandDispatchService: 'command-dispatch',
  commandRegistryService: 'command-registry',
  editorService: 'editor',
  fileStorageIndexedDBService: 'file-storage-indexeddb',
  fileStorageMemoryService: 'file-storage-memory',
  fileStorageNativeFsService: 'file-storage-nativefs',
  fileSystemService: 'file-system-service',
  idbDatabaseService: 'idb-database',
  memoryDatabaseService: 'memory-database',
  memoryRouterService: 'memory-router',
  memorySyncDatabaseService: 'memory-sync-database',
  navigationService: 'navigation-service',
  nodeErrorHandlerService: 'node-error-handler',
  shortcutService: 'shortcut',
  testErrorHandlerService: 'test-error-handler',
  userActivityService: 'user-activity',
  workbenchService: 'workbench',
  workbenchStateService: 'workbench-state',
  workspaceOpsService: 'workspace-ops',
  workspaceService: 'workspace',
  workspaceStateService: 'workspace-state',
  pmEditorService: 'pmEditorService',
} as const;

export const APP_MAIN_CONTENT_PADDING = 'px-4 py-4 pt-0 md:px-6';

export type ServiceName = (typeof SERVICE_NAME)[keyof typeof SERVICE_NAME];

export * from './command';
export * from './browser-history-events';
export * from './theme';
export * from './routes';

// Note we are stuck with these names because of the indexeddb
export const DATABASE_TABLE_NAME = {
  // table for workspace related information like name, last modified, etc (dont contain actual Files)
  workspaceInfo: 'WorkspaceInfo',
  // a dump table for all the other information
  misc: 'MiscTable',
} as const;
