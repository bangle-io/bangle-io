import type { BaseService, Logger } from '@bangle.io/base-utils';
import type { commandExcludedServices } from '@bangle.io/constants';
import type {
  CommandRegistryService,
  FileSystemService,
  NavigationService,
  ShortcutService,
  WorkspaceService,
} from '@bangle.io/service-core';
import type { CommandDispatchService } from '@bangle.io/service-core';
import type {
  BrowserErrorHandlerService,
  IdbDatabaseService,
} from '@bangle.io/service-platform';
import type { BaseAppDatabase } from './base-database';
import type { BaseFileStorageProvider } from './base-file-storage';
import type { BaseRouter } from './base-router';
export type ServiceKind = 'platform' | 'core' | 'ui';

export type BaseServiceOptions = {
  name: string;
  kind: ServiceKind;
  dependencies?: Record<string, BaseService<any>>;
  needsConfig?: boolean;
} & BaseServiceCommonOptions;

export type BaseServiceCommonOptions = {
  logger: Logger;
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
  workspace: WorkspaceService;
  fileSystem: FileSystemService;
  shortcut: ShortcutService;
  // ensure this name stays in sync with the name in the CommandExposedServices
  commandRegistry: CommandRegistryService;
  commandDispatcher: CommandDispatchService;
  navigation: NavigationService;
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
