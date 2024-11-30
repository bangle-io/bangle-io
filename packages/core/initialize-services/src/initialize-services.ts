import {
  type Logger,
  assertIsDefined,
  getEventSenderMetadata,
  throwAppError,
} from '@bangle.io/base-utils';
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
  FileStorageNativeFs,
  IdbDatabaseService,
} from '@bangle.io/service-platform';
import type {
  BaseServiceCommonOptions,
  CoreServices,
  PlatformServices,
  RootEmitter,
  Services,
  Store,
} from '@bangle.io/types';
import { atom } from 'jotai';

export function initializeServices(
  logger: Logger,
  rootEmitter: RootEmitter,
  store: Store,
  theme: ThemeManager,
  abortSignal: AbortSignal,
): Services {
  const commands = getEnabledCommands();

  const commonOpts: BaseServiceCommonOptions = {
    logger,
    store,
    emitAppError(error) {
      rootEmitter.emit('event::error:uncaught-error', {
        error,
        appLikeError: true,
        rejection: false,
        isFakeThrow: true,
        sender: getEventSenderMetadata({ tag: 'initialize-service' }),
      });
    },
  };

  const platformServices = initPlatformServices(commonOpts, rootEmitter);

  const coreServices = initCoreServices(
    commonOpts,
    platformServices,
    rootEmitter,
    theme,
    abortSignal,
  );

  const services: Services = {
    core: coreServices,
    platform: platformServices,
  };

  // init config
  if (platformServices.fileStorage.nativefs instanceof FileStorageNativeFs) {
    platformServices.fileStorage.nativefs.setInitConfig({
      getRootDirHandle: async (wsName: string) => {
        const { rootDirHandle } =
          await coreServices.workspaceOps.getWorkspaceMetadata(wsName);

        if (!rootDirHandle) {
          throwAppError(
            'error::workspace:invalid-metadata',
            `Invalid workspace metadata for ${wsName}. Missing root dir handle`,
            {
              wsName,
            },
          );
        }

        if (!(await FileStorageNativeFs.hasPermission(rootDirHandle))) {
          throwAppError(
            'error::workspace:native-fs-auth-needed',
            `Need permission for ${rootDirHandle.name}`,
            {
              wsName,
            },
          );
        }

        return { handle: rootDirHandle };
      },
    });
  }

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

  // dispose services on abort
  abortSignal.addEventListener(
    'abort',
    () => {
      for (const childServices of Object.values(services)) {
        for (const service of Object.values(childServices)) {
          service.dispose();
        }
      }
    },
    { once: true },
  );

  // any other setup
  return services;
}

function initPlatformServices(
  commonOpts: BaseServiceCommonOptions,
  rootEmitter: RootEmitter,
): PlatformServices {
  const errorService = new BrowserErrorHandlerService(
    commonOpts,
    undefined,
    rootEmitter,
  );
  // error service should be initialized asap to catch any errors
  errorService.initialize();
  const idbDatabase = new IdbDatabaseService(commonOpts, undefined);
  const fileStorageServiceIdb = new FileStorageIndexedDB(
    commonOpts,
    undefined,
    {
      onChange: (change) => {
        commonOpts.logger.info('File storage change:', change);
      },
    },
  );

  const nativeFsFileStorage = new FileStorageNativeFs(commonOpts, undefined, {
    onChange: (change) => {
      commonOpts.logger.info('File storage change:', change);
    },
  });

  const browserRouterService = new BrowserRouterService(commonOpts, undefined);

  return {
    errorService,
    database: idbDatabase,
    fileStorage: {
      [fileStorageServiceIdb.workspaceType]: fileStorageServiceIdb,
      [nativeFsFileStorage.workspaceType]: nativeFsFileStorage,
    },
    router: browserRouterService,
  };
}

function initCoreServices(
  commonOpts: BaseServiceCommonOptions,
  platformServices: PlatformServices,
  rootEmitter: RootEmitter,
  theme: ThemeManager,
  abortSignal: AbortSignal,
): CoreServices {
  const $workspaceChanged = atom(0);
  rootEmitter.on(
    'event::workspace-info:update',
    () => {
      commonOpts.store.set($workspaceChanged, (prev) => prev + 1);
    },
    abortSignal,
  );

  const commandRegistryService = new CommandRegistryService(
    commonOpts,
    undefined,
  );
  const commandDispatcherService = new CommandDispatchService(commonOpts, {
    commandRegistry: commandRegistryService,
  });

  const fileSystemService = new FileSystemService(
    commonOpts,
    { ...platformServices.fileStorage },
    { rootEmitter },
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
    rootEmitter,
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
