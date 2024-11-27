import { type Logger, assertIsDefined } from '@bangle.io/base-utils';
import type { ThemeManager } from '@bangle.io/color-scheme-manager';
import { commandHandlers } from '@bangle.io/command-handlers';
import { getEnabledCommands } from '@bangle.io/commands';

import {
  CommandDispatchService,
  CommandRegistryService,
  FileSystemService,
  NavigationService,
  ShortcutService,
  type ShortcutServiceConfig,
  WorkbenchService,
  WorkbenchStateService,
  WorkspaceOpsService,
  WorkspaceService,
  WorkspaceStateService,
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
import { atom } from 'jotai';

export function initializeServices(
  logger: Logger,
  errorEmitter: ErrorEmitter,
  store: Store,
  theme: ThemeManager,
): Services {
  const commands = getEnabledCommands();

  const commonOpts: BaseServiceCommonOptions = {
    logger,
    store,
  };

  const platformServices = initPlatformServices(commonOpts, errorEmitter);

  const coreServices = initCoreServices(commonOpts, platformServices, theme);

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
  const idbDatabase = new IdbDatabaseService(commonOpts, undefined);
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
  theme: ThemeManager,
): CoreServices {
  const $workspaceChanged = atom(0);

  const commandRegistryService = new CommandRegistryService(
    commonOpts,
    undefined,
  );
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
  const navigation = new NavigationService(commonOpts, {
    routerService: platformServices.router,
  });

  const shortcut = new ShortcutService(commonOpts, undefined, document);
  const workbenchState = new WorkbenchStateService(
    commonOpts,
    undefined,
    theme,
  );

  const workbench = new WorkbenchService(commonOpts, {
    workbenchState,
  });

  const workspaceOps = new WorkspaceOpsService(
    commonOpts,
    { database: platformServices.database },
    (change) => {
      commonOpts.logger.info('Workspace change:', change);
      commonOpts.store.set($workspaceChanged, (prev) => prev + 1);
    },
  );

  const workspaceState = new WorkspaceStateService(commonOpts, {
    navigation,
    fileSystem: fileSystemService,
    workspaceOps,
  });
  const workspace = new WorkspaceService(commonOpts, {
    workspaceOps,
    workspaceState,
    navigation,
    fileSystem: fileSystemService,
  });

  return {
    commandDispatcher: commandDispatcherService,
    commandRegistry: commandRegistryService,
    fileSystem: fileSystemService,
    navigation,
    shortcut,
    workbenchState,
    workspaceOps,
    workbench,
    workspace,
    workspaceState,
  };
}
