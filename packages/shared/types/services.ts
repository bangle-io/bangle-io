import type {
  BaseError,
  BaseErrorService,
  BaseService,
  Logger,
} from '@bangle.io/base-utils';
import type {
  commandExcludedServices,
  WorkspaceStorageType,
} from '@bangle.io/constants';
import type { PmEditorService } from '@bangle.io/editor';
import type {
  CommandDispatchService,
  CommandRegistryService,
  EditorService,
  FileSystemService,
  NavigationService,
  ShortcutService,
  UserActivityService,
  WorkbenchService,
  WorkbenchStateService,
  WorkspaceOpsService,
  WorkspaceService,
  WorkspaceStateService,
} from '@bangle.io/service-core';
import type { createStore } from 'jotai';

import type { BaseAppDatabase, BaseAppSyncDatabase } from './base-database';
import type { BaseFileStorageProvider } from './base-file-storage';
import type { BaseRouter } from './base-router';

export type ServiceKind = 'platform' | 'core';

export type Store = ReturnType<typeof createStore>;

export type BaseServiceCommonOptions = {
  rootAbortSignal: AbortSignal;
  logger: Logger;
  store: Store;
  // for cases where throwing an error is not possible
  emitAppError: (error: BaseError) => void;
};

export type RouterState = {
  [key: string]: unknown;
};

export type AllServices = CoreServices & PlatformServices;
export type Services = {
  core: CoreServices;
  platform: PlatformServices;
};

export type BaseRouterService = BaseRouter<RouterState> & BaseService;

export type CommandExcludedServices = (typeof commandExcludedServices)[number];

// Services exposed to commands
export type CommandExposedServices = Omit<
  CoreServices,
  CommandExcludedServices
>;

export type CoreServices = {
  // ensure this name stays in sync with the name in the CommandExposedServices
  commandDispatcher: CommandDispatchService;
  commandRegistry: CommandRegistryService;
  fileSystem: FileSystemService;
  navigation: NavigationService;
  shortcut: ShortcutService;
  editorService: EditorService;
  workbench: WorkbenchService;
  workbenchState: WorkbenchStateService;
  workspace: WorkspaceService;
  workspaceOps: WorkspaceOpsService;
  workspaceState: WorkspaceStateService;
  userActivityService: UserActivityService;
  pmEditorService: PmEditorService;
};

export type PlatformServices = {
  database: BaseDatabaseService;
  errorService: BaseErrorService;
  fileStorage: Partial<Record<WorkspaceStorageType, BaseFileStorageService>>;
  router: BaseRouterService;
  syncDatabase: BaseSyncDatabaseService;
};

export type AllServiceName = (keyof CoreServices | keyof PlatformServices) & {};

export type BaseDatabaseService = BaseAppDatabase & BaseService;
export type BaseFileStorageService = BaseFileStorageProvider & BaseService;
export type BaseSyncDatabaseService = BaseAppSyncDatabase & BaseService;
