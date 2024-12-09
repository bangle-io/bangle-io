import {
  type Logger,
  assertIsDefined,
  flatServices,
  getEventSenderMetadata,
  throwAppError,
} from '@bangle.io/base-utils';
import type { ThemeManager } from '@bangle.io/color-scheme-manager';
import { commandHandlers } from '@bangle.io/command-handlers';
import { getEnabledCommands } from '@bangle.io/commands';

import {
  CommandDispatchService,
  CommandRegistryService,
  EditorService,
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
import { UserActivityService } from '@bangle.io/service-core';
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
    rootAbortSignal: abortSignal,
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
  );

  const services: Services = {
    core: coreServices,
    platform: platformServices,
  };

  // Init config

  // error service should be initialized asap to catch any errors
  platformServices.errorService.initialize();

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

  coreServices.editorService.setInitConfig({ dummyVal: '' });

  coreServices.fileSystem.setInitConfig({
    getWorkspaceInfo: async ({ wsName }) => {
      const wsInfo = await coreServices.workspaceOps.getWorkspaceInfo(wsName);
      if (!wsInfo) {
        throwAppError(
          'error::workspace:not-found',
          `Workspace not found: ${wsName}`,
          {
            wsName,
          },
        );
      }

      return wsInfo;
    },
  });

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

  // dispose services on abort
  abortSignal.addEventListener(
    'abort',
    () => {
      flatServices(services).forEach((service) => {
        service.dispose();
      });
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
  const errorService = new BrowserErrorHandlerService(commonOpts, undefined, {
    onError: (params) => {
      rootEmitter.emit('event::error:uncaught-error', {
        ...params,
        sender: getEventSenderMetadata({ tag: errorService.name }),
      });
    },
  });

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
): CoreServices {
  const commandRegistryService = new CommandRegistryService(
    commonOpts,
    undefined,
  );
  const commandDispatcherService = new CommandDispatchService(
    commonOpts,
    {
      commandRegistry: commandRegistryService,
    },
    {
      emitResult: (result) => {
        rootEmitter.emit('event::command:result', result);
      },
    },
  );

  const fileSystemService = new FileSystemService(
    commonOpts,
    { ...platformServices.fileStorage },
    {
      fileStorageServices: platformServices.fileStorage,
      emitter: rootEmitter.scoped(
        ['event::file:update', 'event::file:force-update'],
        commonOpts.rootAbortSignal,
      ),
    },
  );
  const navigation = new NavigationService(commonOpts, {
    routerService: platformServices.router,
  });

  const shortcut = new ShortcutService(commonOpts, undefined, document);
  const workbenchState = new WorkbenchStateService(commonOpts, undefined, {
    themeManager: theme,
    emitter: rootEmitter.scoped(
      ['event::app:reload-ui'],
      commonOpts.rootAbortSignal,
    ),
  });

  const workbench = new WorkbenchService(commonOpts, {
    workbenchState,
  });

  const workspaceOps = new WorkspaceOpsService(commonOpts, {
    database: platformServices.database,
  });

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

  const userActivityService = new UserActivityService(
    commonOpts,
    {
      workspaceState: workspaceState,
      workspaceOps: workspaceOps,
    },
    {
      emitter: rootEmitter.scoped(
        ['event::command:result'],
        commonOpts.rootAbortSignal,
      ),
    },
  );

  const editorService = new EditorService(
    commonOpts,
    {},
    {
      emitter: rootEmitter.scoped(
        ['event::editor:reload-editor', 'event::file:force-update'],
        commonOpts.rootAbortSignal,
      ),
    },
  );

  return {
    commandDispatcher: commandDispatcherService,
    commandRegistry: commandRegistryService,
    editorService,
    fileSystem: fileSystemService,
    navigation,
    shortcut,
    userActivityService,
    workbench,
    workbenchState,
    workspace,
    workspaceOps,
    workspaceState,
  };
}
