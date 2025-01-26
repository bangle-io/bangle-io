import {
  assertIsDefined,
  getEventSenderMetadata,
  throwAppError,
} from '@bangle.io/base-utils';
import type { ThemeManager } from '@bangle.io/color-scheme-manager';
import {
  BrowserErrorHandlerService,
  BrowserLocalStorageSyncDatabaseService,
  BrowserRouterService,
  FileStorageIndexedDB,
  FileStorageNativeFs,
  IdbDatabaseService,
} from '@bangle.io/service-platform';

import {
  CommandDispatchService,
  CommandRegistryService,
  EditorService,
  FileSystemService,
  NavigationService,
  ShortcutService,
  type ShortcutServiceConfig,
  UserActivityService,
  WorkbenchService,
  WorkbenchStateService,
  WorkspaceOpsService,
  WorkspaceService,
  WorkspaceStateService,
} from '@bangle.io/service-core';

import { PmEditorService } from '@bangle.io/editor';
import { Container } from '@bangle.io/poor-mans-di';
import {
  HashStrategy,
  PathBasedStrategy,
  QueryStringStrategy,
} from '@bangle.io/service-platform';
import type {
  BaseServiceCommonOptions,
  Command,
  CommandHandler,
  CoreServices,
  PlatformServices,
  RootEmitter,
} from '@bangle.io/types';

export function initializeServices(
  commonOpts: BaseServiceCommonOptions,
  rootEmitter: RootEmitter,
  commands: Command[],
  commandHandlers: Array<{ id: string; handler: CommandHandler }>,
  theme: ThemeManager,
) {
  const container = new Container(
    {
      context: commonOpts,
      abortSignal: commonOpts.rootAbortSignal,
    },
    {
      // Platform services
      errorService: BrowserErrorHandlerService,
      database: IdbDatabaseService,
      syncDatabase: BrowserLocalStorageSyncDatabaseService,
      fileStorageIdb: FileStorageIndexedDB,
      fileStorageNativeFs: FileStorageNativeFs,
      router: BrowserRouterService,

      // Core services
      commandDispatcher: CommandDispatchService,
      commandRegistry: CommandRegistryService,
      fileSystem: FileSystemService,
      navigation: NavigationService,
      shortcut: ShortcutService,
      editorService: EditorService,
      workbench: WorkbenchService,
      workbenchState: WorkbenchStateService,
      workspace: WorkspaceService,
      workspaceOps: WorkspaceOpsService,
      workspaceState: WorkspaceStateService,
      userActivityService: UserActivityService,
      pmEditorService: PmEditorService,
    },
  );

  container.setConfig(BrowserRouterService, () => ({
    strategy: new HashStrategy(),
    basePath: '/ws',
  }));

  container.setConfig(BrowserErrorHandlerService, () => ({
    onError: (params) => {
      rootEmitter.emit('event::error:uncaught-error', {
        ...params,
        sender: getEventSenderMetadata({ tag: 'BrowserErrorHandlerService' }),
      });
    },
  }));

  container.setConfig(FileStorageIndexedDB, () => ({
    onChange: (change) => {
      commonOpts.logger.info('File storage change:', change);
    },
  }));

  // Core service configs
  container.setConfig(CommandRegistryService, () => ({
    commands,
    commandHandlers,
  }));

  container.setConfig(CommandDispatchService, () => ({
    emitResult: (result) => {
      rootEmitter.emit('event::command:result', result);
    },
  }));

  container.setConfig(FileSystemService, () => ({
    emitter: rootEmitter.scoped(
      ['event::file:update', 'event::file:force-update'],
      commonOpts.rootAbortSignal,
    ),
  }));

  container.setConfig(ShortcutService, () => ({
    target: document,
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
            services.commandDispatcher.dispatch(
              command.id as any,
              event,
              `keyboard(${keys})`,
            );
          },
          options: {
            unique: true,
          },
        };
      }),
  }));

  container.setConfig(UserActivityService, () => ({
    emitter: rootEmitter.scoped(
      ['event::command:result'],
      commonOpts.rootAbortSignal,
    ),
  }));

  container.setConfig(WorkbenchStateService, () => ({
    themeManager: theme,
    emitter: rootEmitter.scoped(
      ['event::app:reload-ui'],
      commonOpts.rootAbortSignal,
    ),
  }));

  container.setConfig(EditorService, () => ({
    emitter: rootEmitter.scoped(
      ['event::editor:reload-editor', 'event::file:force-update'],
      commonOpts.rootAbortSignal,
    ),
  }));

  container.setConfig(FileStorageNativeFs, () => ({
    onChange: (change) => {
      commonOpts.logger.info('File storage change:', change);
    },
  }));

  container.setConfig(PmEditorService, () => ({
    nothing: true,
  }));

  const services = container.instantiateAll();

  services.commandDispatcher.exposedServices = {
    ...services,
  };

  const fileStorageServices = {
    [services.fileStorageIdb.workspaceType]: services.fileStorageIdb,
    [services.fileStorageNativeFs.workspaceType]: services.fileStorageNativeFs,
  };
  services.fileSystem.fileStorageServices = fileStorageServices;
  services.fileSystem.getWorkspaceInfo = async ({ wsName }) => {
    const wsInfo = await services.workspaceOps.getWorkspaceInfo(wsName);
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
  };

  services.fileStorageNativeFs.getRootDirHandle = async (wsName: string) => {
    const { rootDirHandle } =
      await services.workspaceOps.getWorkspaceMetadata(wsName);

    if (!rootDirHandle) {
      throwAppError(
        'error::workspace:invalid-metadata',
        `Invalid workspace metadata for ${wsName}`,
        { wsName },
      );
    }

    if (!(await FileStorageNativeFs.hasPermission(rootDirHandle))) {
      throwAppError(
        'error::workspace:native-fs-auth-needed',
        `Need permission for ${rootDirHandle.name}`,
        { wsName },
      );
    }

    return { handle: rootDirHandle };
  };

  const platformServices = {
    errorService: services.errorService,
    database: services.database,
    syncDatabase: services.syncDatabase,
    fileStorage: fileStorageServices,
    router: services.router,
  } satisfies PlatformServices;

  return {
    platformServices,
    coreServices: {
      commandDispatcher: services.commandDispatcher,
      commandRegistry: services.commandRegistry,
      fileSystem: services.fileSystem,
      navigation: services.navigation,
      shortcut: services.shortcut,
      editorService: services.editorService,
      workbench: services.workbench,
      workbenchState: services.workbenchState,
      workspace: services.workspace,
      workspaceOps: services.workspaceOps,
      workspaceState: services.workspaceState,
      userActivityService: services.userActivityService,
      pmEditorService: services.pmEditorService,
    } satisfies CoreServices,
    mountAll: () => {
      container.mountAll();
    },
  };
}
