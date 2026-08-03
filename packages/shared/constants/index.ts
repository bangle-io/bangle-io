const LIGHT_SCHEME = 'light' as const;
const DARK_SCHEME = 'dark' as const;
export const COLOR_SCHEME = {
  LIGHT: LIGHT_SCHEME,
  DARK: DARK_SCHEME,
} as const;
export const WIDESCREEN_WIDTH = 768;
export const SIDEBAR_DEFAULT_WIDTH = 272;
export const SIDEBAR_MIN_WIDTH = 224;
export const SIDEBAR_MAX_WIDTH = 400;
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
  {
    id: 'recovery',
    route: 'settings-recovery',
    commandId: 'command::ui:open-settings-recovery',
    commandTitle: 'Settings - Recover',
    commandKeywords: [
      'settings',
      'recover',
      'recovery',
      'snapshot',
      'snapshots',
      'history',
      'backup',
      'restore',
    ],
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
/**
 * The editor engines that can power the note editing surface
 * (see plans/011-wordgard-editor-w-migration.md). The URL selection and every
 * `EditorEngineContract.engineId` must be one of these.
 */
export const EDITOR_ENGINE_IDS = ['prosemirror', 'wordgard'] as const;
export type EditorEngineId = (typeof EDITOR_ENGINE_IDS)[number];
/** ProseMirror stays the default engine until the plans/011 M6 flip. */
export const DEFAULT_EDITOR_ENGINE: EditorEngineId = 'prosemirror';
export function isEditorEngineId(value: unknown): value is EditorEngineId {
  return (
    typeof value === 'string' &&
    EDITOR_ENGINE_IDS.includes(value as EditorEngineId)
  );
}
export const EDITOR_ENGINE_QUERY_PARAM = 'editorEngine';
/**
 * Maximum time a destructive editor lifecycle or file relocation waits for
 * the current tab's writes. Healthy saves settle quickly; reaching this bound
 * indicates a failed save whose in-memory content must remain recoverable.
 */
export const EDITOR_SAVE_DRAIN_TIMEOUT_MS = 5_000;

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
export const FILE_STORAGE_MAX_FILE_SIZE_BYTES = {
  browser: 25 * 1024 * 1024,
  memory: 25 * 1024 * 1024,
  nativeFs: 250 * 1024 * 1024,
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
  fileSystemService: 'file-system-service',
  idbDatabaseService: 'idb-database',
  memoryDatabaseService: 'memory-database',
  memoryRouterService: 'memory-router',
  memorySyncDatabaseService: 'memory-sync-database',
  navigationService: 'navigation-service',
  nodeErrorHandlerService: 'node-error-handler',
  noteSnapshotService: 'note-snapshot',
  shortcutService: 'shortcut',
  testErrorHandlerService: 'test-error-handler',
  userActivityService: 'user-activity',
  workbenchStateService: 'workbench-state',
  workspaceOpsService: 'workspace-ops',
  workspaceStateService: 'workspace-state',
  pmEditorService: 'pmEditorService',
  editorWService: 'editor-w',
} as const;
export const APP_MAIN_CONTENT_PADDING = 'px-4 py-4 pt-0 md:px-6';
/**
 * Left gutter for the editor page: wider than the default content padding so
 * the hover block handle ("+" and drag grip side by side) fits beside the
 * text. Sections rendered below the editor (e.g. linked mentions) share it so
 * their content stays aligned with the editor text.
 */
export const EDITOR_GUTTER_PADDING_LEFT = 'pl-10 md:pl-14';
export type ServiceName = (typeof SERVICE_NAME)[keyof typeof SERVICE_NAME];
/**
 * Sender tag on `event::file:update` / `event::file:force-update` events that
 * originated from a storage watcher observing changes made OUTSIDE this app
 * (sync tools, other editors). Consumers use it to react to external edits
 * without re-triggering on the app's own writes.
 */
export const EXTERNAL_FILE_CHANGE_SENDER_TAG = 'external-file-change';
export { browserHistoryStateEvents } from './browser-history-events';
export { commandExcludedServices, commandKeyToContext } from './command';
export { THEME_MANAGER_CONFIG } from './theme';
// Note we are stuck with these names because of the indexeddb
export const DATABASE_TABLE_NAME = {
  // table for workspace related information like name, last modified, etc (dont contain actual Files)
  workspaceInfo: 'WorkspaceInfo',
  // a dump table for all the other information
  misc: 'MiscTable',
  // metadata of point-in-time note copies kept for user-driven recovery
  noteSnapshots: 'NoteSnapshots',
  // the (potentially large) content bodies of note snapshots, keyed by the
  // same snapshot id, so listing/eviction never has to load content
  noteSnapshotsContent: 'NoteSnapshotsContent',
} as const;
