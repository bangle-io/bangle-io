import { type Logger, assertIsDefined } from '@bangle.io/base-utils';
import { commandHandlers } from '@bangle.io/command-handlers';
import { getEnabledCommands } from '@bangle.io/commands';
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
  BaseServiceCommonOptions,
  CoreServices,
  ErrorEmitter,
  PlatformServices,
  Services,
  Store,
} from '@bangle.io/types';

export function initializeServices(
  logger: Logger,
  errorEmitter: ErrorEmitter,
  store: Store,
): Services {
  const commands = getEnabledCommands();

  const commonOpts: BaseServiceCommonOptions = {
    logger,
    store,
  };

  const platformServices = initPlatformServices(commonOpts, errorEmitter);

  const coreServices = initCoreServices(commonOpts, platformServices);

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
  commonOpts: BaseServiceCommonOptions,
  errorEmitter: ErrorEmitter,
): PlatformServices {
  const errorService = new BrowserErrorHandlerService(
    commonOpts,
    undefined,
    errorEmitter,
  );
  // error service should be initialized asap to catch any errors
  errorService.initialize();
  const idbDatabase = new IdbDatabaseService(commonOpts);
  const fileStorageServiceIdb = new FileStorageIndexedDB(
    commonOpts,
    undefined,
    (change) => {
      commonOpts.logger.info('File storage change:', change);
    },
  );

  const browserRouterService = new BrowserRouterService(commonOpts, undefined);

  return {
    errorService,
    database: idbDatabase,
    fileStorage: fileStorageServiceIdb,
    router: browserRouterService,
  };
}

function initCoreServices(
  commonOpts: BaseServiceCommonOptions,
  platformServices: PlatformServices,
): CoreServices {
  const commandRegistryService = new CommandRegistryService(commonOpts);
  const commandDispatcherService = new CommandDispatchService(commonOpts, {
    commandRegistry: commandRegistryService,
  });
  const fileSystemService = new FileSystemService(
    commonOpts,
    { fileStorageService: platformServices.fileStorage },
    (change) => {
      commonOpts.logger.info('File change:', change);
    },
  );
  const navigationService = new NavigationService(commonOpts, {
    routerService: platformServices.router,
  });
  const shortcutService = new ShortcutService(commonOpts, undefined, document);
  const workspaceService = new WorkspaceService(
    commonOpts,
    { database: platformServices.database },
    (change) => {
      commonOpts.logger.info('Workspace change:', change);
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
