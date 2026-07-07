const LIGHT_SCHEME = 'light' as const;
const DARK_SCHEME = 'dark' as const;
export const COLOR_SCHEME = {
  LIGHT: LIGHT_SCHEME,
  DARK: DARK_SCHEME,
} as const;
export const WIDESCREEN_WIDTH = 759;
export const KEYBOARD_SHORTCUTS = {
  toggleOmniSearch: { id: 'toggleOmniSearch', keys: ['ctrl', 'k'] },
} as const;
export const SETTINGS_DEFAULT_COMMAND = {
  id: 'command::ui:open-settings',
  route: 'settings-general',
  title: 'Settings',
  keywords: ['settings', 'preferences'],
} as const;
export const SETTINGS_PAGE_DEFINITIONS = [
  {
    id: 'general',
    route: 'settings-general',
    commandId: 'command::ui:open-settings-general',
    commandTitle: 'Settings - General',
    commandKeywords: ['settings', 'preferences', 'general'],
  },
  {
    id: 'workspaces',
    route: 'settings-workspaces',
    commandId: 'command::ui:open-settings-workspaces',
    commandTitle: 'Settings - Workspaces',
    commandKeywords: ['settings', 'preferences', 'workspaces', 'workspace'],
  },
] as const;
export type SettingsPageDefinition = (typeof SETTINGS_PAGE_DEFINITIONS)[number];
export type SettingsPageId = SettingsPageDefinition['id'];
export type SettingsRoute = SettingsPageDefinition['route'];
export function isSettingsRoute(route: string): route is SettingsRoute {
  return SETTINGS_PAGE_DEFINITIONS.some((page) => page.route === route);
}
export function isSettingsRouteInfo<RouteInfo extends { route: string }>(
  routeInfo: RouteInfo,
): routeInfo is Extract<RouteInfo, { route: SettingsRoute }> {
  return isSettingsRoute(routeInfo.route);
}
export const ASSET_LOCATION_PREFERENCES = [
  'assets-folder',
  'adjacent',
] as const;
export type AssetLocationPreference =
  (typeof ASSET_LOCATION_PREFERENCES)[number];
export function isAssetLocationPreference(
  value: unknown,
): value is AssetLocationPreference {
  return (
    typeof value === 'string' &&
    ASSET_LOCATION_PREFERENCES.includes(value as AssetLocationPreference)
  );
}
export const WORKSPACE_STORAGE_TYPE = {
  Help: 'helpfs',
  NativeFS: 'nativefs',
  Browser: 'browser',
  PrivateFS: 'privatefs',
  Github: 'github-storage',
  Memory: 'memory',
  // A file store on a user-provided HTTP server (bring-your-own-server), or the
  // same server serving the bundled app. Portable across web and desktop.
  Remote: 'remote',
  // The desktop app's own on-disk store, reached over IPC to the Electron main
  // process. Local to that install; shares the remote provider's transport.
  Electron: 'electron',
} as const;
export type WorkspaceStorageType =
  (typeof WORKSPACE_STORAGE_TYPE)[keyof typeof WORKSPACE_STORAGE_TYPE];
export const FILE_STORAGE_MAX_FILE_SIZE_BYTES = {
  browser: 25 * 1024 * 1024,
  memory: 25 * 1024 * 1024,
  nativeFs: 250 * 1024 * 1024,
  remote: 50 * 1024 * 1024,
  electron: 250 * 1024 * 1024,
} as const;

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
  fileStorageRemoteService: 'file-storage-remote',
  fileStorageElectronService: 'file-storage-electron',
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

// Electron desktop: the renderer talks to a file store hosted in the main
// process over IPC. This backs the `electron` ("This device") workspace type.
export const DESKTOP_REMOTE_FS_IPC_CHANNEL = 'bangle:remote-fs';
export type ServiceName = (typeof SERVICE_NAME)[keyof typeof SERVICE_NAME];
export { browserHistoryStateEvents } from './browser-history-events';
export { commandExcludedServices, commandKeyToContext } from './command';
export { ROUTES } from './routes';
export { THEME_MANAGER_CONFIG } from './theme';
// Note we are stuck with these names because of the indexeddb
export const DATABASE_TABLE_NAME = {
  // table for workspace related information like name, last modified, etc (dont contain actual Files)
  workspaceInfo: 'WorkspaceInfo',
  // a dump table for all the other information
  misc: 'MiscTable',
} as const;
