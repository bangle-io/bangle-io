import { commandHandlers } from '@bangle.io/command-handlers';
import { bangleAppCommands } from '@bangle.io/commands';
import type { Logger } from '@bangle.io/logger';
import {
  CommandDispatchService,
  CommandRegistryService,
  FileSystemService,
  ShortcutService,
  WorkspaceService,
} from '@bangle.io/service-core';
import {
  BrowserErrorHandlerService,
  FileStorageIndexedDB,
  IdbDatabaseService,
} from '@bangle.io/service-platform';
import type {
  CoreServices,
  ErrorEmitter,
  PlatformServices,
  Services,
} from '@bangle.io/types';

function initPlatformServices(
  logger: Logger,
  errorEmitter: ErrorEmitter,
): PlatformServices {
  const errorService = new BrowserErrorHandlerService(logger, errorEmitter);
  // error service should be initialized asap to catch any errors
  errorService.initialize();
  const idbDatabase = new IdbDatabaseService(logger);
  const fileStorageServiceIdb = new FileStorageIndexedDB(logger, (change) => {
    logger.info('File storage change:', change);
  });

  return {
    errorService,
    database: idbDatabase,
    fileStorage: fileStorageServiceIdb,
  };
}

function initCoreServices(
  logger: Logger,
  platformServices: PlatformServices,
): CoreServices {
  const commandRegistryService = new CommandRegistryService(logger);
  const commandDispatcherService = new CommandDispatchService(logger, {
    commandRegistry: commandRegistryService,
  });
  const fileSystemService = new FileSystemService(
    logger,
    { fileStorageService: platformServices.fileStorage },
    (change) => {
      logger.info('File change:', change);
    },
  );
  const shortcutService = new ShortcutService(logger, document);
  const workspaceService = new WorkspaceService(
    logger,
    { database: platformServices.database },
    (change) => {
      logger.info('Workspace change:', change);
    },
  );

  return {
    commandDispatcher: commandDispatcherService,
    commandRegistry: commandRegistryService,
    fileSystem: fileSystemService,
    shortcut: shortcutService,
    workspace: workspaceService,
  };
}

export function initializeServices(
  logger: Logger,
  errorEmitter: ErrorEmitter,
): Services {
  const platformServices = initPlatformServices(logger, errorEmitter);

  const coreServices = initCoreServices(logger, platformServices);

  const services: Services = {
    core: coreServices,
    platform: platformServices,
  };

  // init config
  coreServices.commandDispatcher.setInitConfig({
    exposedServices: {
      ...coreServices,
      ...platformServices,
    },
  });

  coreServices.commandRegistry.setInitConfig({
    commands: bangleAppCommands,
    commandHandlers: commandHandlers,
  });

  // init services

  // any other setup
  return services;
}
