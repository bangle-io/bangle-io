import type { BaseService, Logger } from '@bangle.io/base-utils';
import type { commandExcludedServices } from '@bangle.io/constants';
import type {
  CommandDispatchService,
  CommandRegistryService,
  FileSystemService,
  NavigationService,
  ShortcutService,
  WorkbenchService,
  WorkbenchStateService,
  WorkspaceOpsService,
  WorkspaceService,
  WorkspaceStateService,
} from '@bangle.io/service-core';
import type {
  BrowserErrorHandlerService,
  IdbDatabaseService,
} from '@bangle.io/service-platform';
import type { createStore } from 'jotai';

import type { BaseAppDatabase } from './base-database';
import type { BaseFileStorageProvider } from './base-file-storage';
import type { BaseRouter } from './base-router';

export type ServiceKind = 'platform' | 'core';

export type Store = ReturnType<typeof createStore>;

export type BaseServiceOptions = {
  name: string;
  kind: ServiceKind;
  dependencies?: Record<string, BaseService<any>>;
  needsConfig?: boolean;
} & BaseServiceCommonOptions;

export type BaseServiceCommonOptions = {
  logger: Logger;
  store: Store;
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
export type CommandExposedServices = Omit<AllServices, CommandExcludedServices>;

export type CoreServices = {
  // ensure this name stays in sync with the name in the CommandExposedServices
  commandDispatcher: CommandDispatchService;
  commandRegistry: CommandRegistryService;
  fileSystem: FileSystemService;
  navigation: NavigationService;
  shortcut: ShortcutService;
  workbench: WorkbenchService;
  workbenchState: WorkbenchStateService;
  workspace: WorkspaceService;
  workspaceOps: WorkspaceOpsService;
  workspaceState: WorkspaceStateService;
};

export type PlatformServices = {
  database: IdbDatabaseService;
  errorService: BrowserErrorHandlerService;
  fileStorage: BaseFileStorageService;
  router: BaseRouterService;
};

export type AllServiceName = (keyof CoreServices | keyof PlatformServices) & {};

export type BaseDatabaseService = BaseAppDatabase & BaseService;
export type BaseFileStorageService = BaseFileStorageProvider & BaseService;
