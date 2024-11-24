import { assertIsDefined } from '@bangle.io/base-utils';
import { commandHandlers } from '@bangle.io/command-handlers';
import { getEnabledCommands } from '@bangle.io/commands';
import type { Logger } from '@bangle.io/logger';
import {
  CommandDispatchService,
  CommandRegistryService,
  FileSystemService,
  NavigationService,
  ShortcutService,
  type ShortcutServiceConfig,
  WorkspaceService,
} from '@bangle.io/service-core';
import {
  BrowserErrorHandlerService,
  BrowserRouterService,
  FileStorageIndexedDB,
  IdbDatabaseService,
} from '@bangle.io/service-platform';
import type {
  CoreServices,
  ErrorEmitter,
  PlatformServices,
  Services,
} from '@bangle.io/types';

const commands = getEnabledCommands();

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
  coreServices.commandRegistry.setInitConfig({
    commands,
    commandHandlers: commandHandlers,
  });
  coreServices.commandDispatcher.setInitConfig({
    exposedServices: {
      ...coreServices,
      ...platformServices,
    },
  });

  coreServices.shortcut.setInitConfig({
    shortcuts: commands
      .filter((command) => command.keybindings)
      .map((command): ShortcutServiceConfig => {
        assertIsDefined(command.keybindings);
        const keys = command.keybindings.join('-');
        return {
          keyBinding: {
            id: command.id,
            keys,
          },
          handler: (event) => {
            coreServices.commandDispatcher.dispatch(
              // @ts-ignore - we know this is defined and typed
              command.id,
              event,
              `keyboard(${keys})`,
            );
          },
          options: {
            unique: true,
          },
        };
      }),
  });

  // init services

  // any other setup
  return services;
}

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

  const browserRouterService = new BrowserRouterService(logger);

  return {
    errorService,
    database: idbDatabase,
    fileStorage: fileStorageServiceIdb,
    router: browserRouterService,
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
  const navigationService = new NavigationService(logger, {
    routerService: platformServices.router,
  });
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
    navigation: navigationService,
    shortcut: shortcutService,
    workspace: workspaceService,
  };
}
