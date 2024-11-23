import type { commandExcludedServices } from '@bangle.io/constants';
import type {
  CommandRegistryService,
  FileSystemService,
  ShortcutService,
  WorkspaceService,
} from '@bangle.io/service-core';
import type { CommandDispatchService } from '@bangle.io/service-core';
import type {
  BrowserErrorHandlerService,
  IdbDatabaseService,
} from '@bangle.io/service-platform';
import type { BaseService } from '../base-utils';
import type { BaseAppDatabase } from './base-database';
import type { BaseFileStorageProvider } from './base-file-storage';

export type AllServices = CoreServices & PlatformServices;
export type Services = {
  core: CoreServices;
  platform: PlatformServices;
};

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
};

export type PlatformServices = {
  database: IdbDatabaseService;
  errorService: BrowserErrorHandlerService;
  fileStorage: FileStorageService;
};

export type AllServiceName = (keyof CoreServices | keyof PlatformServices) & {};

export type DatabaseService = BaseAppDatabase & BaseService;
export type FileStorageService = BaseFileStorageProvider & BaseService;
