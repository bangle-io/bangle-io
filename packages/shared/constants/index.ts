const LIGHT_SCHEME = 'light' as const;
const DARK_SCHEME = 'dark' as const;

/** @public */
export const COLOR_SCHEME = {
  LIGHT: LIGHT_SCHEME,
  DARK: DARK_SCHEME,
} as const;

/** @public */
export const WIDESCREEN_WIDTH = 759;

/** @public */
export const KEYBOARD_SHORTCUTS = {
  toggleOmniSearch: { id: 'toggleOmniSearch', keys: ['ctrl', 'k'] },
} as const;

/** @public */
export const SETTINGS_DEFAULT_COMMAND = {
  id: 'command::ui:open-settings',
  route: 'settings-general',
  title: 'Settings',
  keywords: ['settings', 'preferences'],
} as const;

/** @public */
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

/** @public */
export type SettingsPageDefinition = (typeof SETTINGS_PAGE_DEFINITIONS)[number];
/** @public */
export type SettingsPageId = SettingsPageDefinition['id'];
/** @public */
export type SettingsRoute = SettingsPageDefinition['route'];

/** @public */
export function isSettingsRoute(route: string): route is SettingsRoute {
  return SETTINGS_PAGE_DEFINITIONS.some((page) => page.route === route);
}

/** @public */
export function isSettingsRouteInfo<RouteInfo extends { route: string }>(
  routeInfo: RouteInfo,
): routeInfo is Extract<RouteInfo, { route: SettingsRoute }> {
  return isSettingsRoute(routeInfo.route);
}

/** @public */
export const ASSET_LOCATION_PREFERENCES = [
  'assets-folder',
  'adjacent',
] as const;

/** @public */
export type AssetLocationPreference =
  (typeof ASSET_LOCATION_PREFERENCES)[number];

/** @public */
export function isAssetLocationPreference(
  value: unknown,
): value is AssetLocationPreference {
  return (
    typeof value === 'string' &&
    ASSET_LOCATION_PREFERENCES.includes(value as AssetLocationPreference)
  );
}

/** @public */
export const WORKSPACE_STORAGE_TYPE = {
  Help: 'helpfs',
  NativeFS: 'nativefs',
  Browser: 'browser',
  PrivateFS: 'privatefs',
  Github: 'github-storage',
  Memory: 'memory',
} as const;

/** @public */
export type WorkspaceStorageType =
  (typeof WORKSPACE_STORAGE_TYPE)[keyof typeof WORKSPACE_STORAGE_TYPE];

/** @public */
export const FILE_STORAGE_MAX_FILE_SIZE_BYTES = {
  browser: 25 * 1024 * 1024,
  memory: 25 * 1024 * 1024,
  nativeFs: 250 * 1024 * 1024,
} as const;

// Add all service names here
/** @public */
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

/** @public */
export const APP_MAIN_CONTENT_PADDING = 'px-4 py-4 pt-0 md:px-6';

/** @public */
export type ServiceName = (typeof SERVICE_NAME)[keyof typeof SERVICE_NAME];

/** @public */
export * from './browser-history-events';
/** @public */
export * from './command';
/** @public */
export * from './routes';
/** @public */
export * from './theme';

// Note we are stuck with these names because of the indexeddb
/** @public */
export const DATABASE_TABLE_NAME = {
  // table for workspace related information like name, last modified, etc (dont contain actual Files)
  workspaceInfo: 'WorkspaceInfo',
  // a dump table for all the other information
  misc: 'MiscTable',
} as const;
