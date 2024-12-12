// initialize-service (refactored to a class-based approach)

import {
  type BaseService,
  assertIsDefined,
  throwAppError,
} from '@bangle.io/base-utils';
import type { ThemeManager } from '@bangle.io/color-scheme-manager';

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

import type {
  BaseServiceCommonOptions,
  Command,
  CommandHandler,
  CoreServices,
  PlatformServices,
  RootEmitter,
} from '@bangle.io/types';

type ServiceCreator<T extends BaseService<any>> = {
  create: () => T;
  configure?: (instance: T, { xyz }: { xyz: string }) => void;
};

export class ServiceFactory {
  private instanceMap = new Map<string, BaseService<any>>();
  private configurationMap = new Map<
    string,
    NonNullable<ServiceCreator<BaseService<any>>['configure']>
  >();

  create<T extends BaseService<any>>(
    serviceClass: new (...args: any[]) => T,
    creator: ServiceCreator<T>,
  ): T {
    const name = serviceClass.name;
    const existing = this.instanceMap.get(name) as T | undefined;

    if (existing) {
      return existing;
    }

    const instance = creator.create();
    this.instanceMap.set(name, instance);

    if (creator.configure) {
      this.configurationMap.set(name, creator.configure as any);
    }

    return instance;
  }

  configure() {
    for (const [name, configure] of this.configurationMap) {
      const instance = this.instanceMap.get(name);
      if (instance) {
        configure(instance, { xyz: 'abc' });
      }
    }
    this.configurationMap.clear();
  }

  disposeAll() {
    for (const service of this.instanceMap.values()) {
      service.dispose();
    }
  }

  initAll() {
    for (const service of this.instanceMap.values()) {
      service.initialize();
    }
  }
}

export class CoreServiceManager {
  constructor(
    private factory: ServiceFactory,
    private commonOpts: BaseServiceCommonOptions,
    private platform: PlatformServices,
    private rootEmitter: RootEmitter,
    private commands: Command[],
    private commandHandlers: Array<{ id: string; handler: CommandHandler }>,
    private theme: ThemeManager,
  ) {}

  configure() {
    this.factory.configure();
  }

  coreCommandRegistryService() {
    return this.factory.create(CommandRegistryService, {
      create: () => new CommandRegistryService(this.commonOpts, undefined),
      configure: (commandRegistry) => {
        commandRegistry.setInitConfig({
          commands: this.commands,
          commandHandlers: this.commandHandlers,
        });
      },
    });
  }

  coreCommandDispatchService() {
    return this.factory.create(CommandDispatchService, {
      create: () => {
        return new CommandDispatchService(
          this.commonOpts,
          {
            commandRegistry: this.coreCommandRegistryService(),
          },
          {
            emitResult: (result) => {
              this.rootEmitter.emit('event::command:result', result);
            },
          },
        );
      },
      configure: (commandDispatcher) => {
        commandDispatcher.setInitConfig({
          exposedServices: {
            ...this.getServices(),
          },
        });
      },
    });
  }

  coreFileSystemService() {
    return this.factory.create(FileSystemService, {
      create: () => {
        return new FileSystemService(
          this.commonOpts,
          {
            ...this.platform.fileStorage,
          },
          {
            fileStorageServices: this.platform.fileStorage,
            emitter: this.rootEmitter.scoped(
              ['event::file:update', 'event::file:force-update'],
              this.commonOpts.rootAbortSignal,
            ),
          },
        );
      },
      configure: (fileSystemService) => {
        const workspaceOps = this.coreWorkspaceOpsService();
        fileSystemService.setInitConfig({
          getWorkspaceInfo: async ({ wsName }) => {
            const wsInfo = await workspaceOps.getWorkspaceInfo(wsName);
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
      },
    });
  }

  coreNavigationService() {
    return this.factory.create(NavigationService, {
      create: () =>
        new NavigationService(this.commonOpts, {
          routerService: this.platform.router,
        }),
    });
  }

  coreShortcutService() {
    return this.factory.create(ShortcutService, {
      create: () => new ShortcutService(this.commonOpts, undefined, document),
      configure: (shortcut) => {
        const coreCommandDispatchService = this.coreCommandDispatchService();
        shortcut.setInitConfig({
          shortcuts: this.commands
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
                  coreCommandDispatchService.dispatch(
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
        });
      },
    });
  }

  coreWorkspaceOpsService() {
    return this.factory.create(WorkspaceOpsService, {
      create: () =>
        new WorkspaceOpsService(this.commonOpts, {
          database: this.platform.database,
        }),
    });
  }

  coreWorkspaceStateService() {
    return this.factory.create(WorkspaceStateService, {
      create: () =>
        new WorkspaceStateService(this.commonOpts, {
          navigation: this.coreNavigationService(),
          fileSystem: this.coreFileSystemService(),
          workspaceOps: this.coreWorkspaceOpsService(),
        }),
    });
  }

  coreUserActivityService() {
    return this.factory.create(UserActivityService, {
      create: () =>
        new UserActivityService(
          this.commonOpts,
          {
            workspaceState: this.coreWorkspaceStateService(),
            workspaceOps: this.coreWorkspaceOpsService(),
          },
          {
            emitter: this.rootEmitter.scoped(
              ['event::command:result'],
              this.commonOpts.rootAbortSignal,
            ),
          },
        ),
    });
  }

  coreWorkbenchStateService() {
    return this.factory.create(WorkbenchStateService, {
      create: () =>
        new WorkbenchStateService(
          this.commonOpts,
          {
            database: this.platform.database,
            syncDatabase: this.platform.syncDatabase,
          },
          {
            themeManager: this.theme,
            emitter: this.rootEmitter.scoped(
              ['event::app:reload-ui'],
              this.commonOpts.rootAbortSignal,
            ),
          },
        ),
    });
  }

  coreWorkbenchService() {
    return this.factory.create(WorkbenchService, {
      create: () =>
        new WorkbenchService(this.commonOpts, {
          workbenchState: this.coreWorkbenchStateService(),
        }),
    });
  }

  coreWorkspaceService() {
    return this.factory.create(WorkspaceService, {
      create: () =>
        new WorkspaceService(this.commonOpts, {
          workspaceOps: this.coreWorkspaceOpsService(),
          workspaceState: this.coreWorkspaceStateService(),
          navigation: this.coreNavigationService(),
          fileSystem: this.coreFileSystemService(),
        }),
    });
  }

  coreEditorService() {
    return this.factory.create(EditorService, {
      create: () =>
        new EditorService(
          this.commonOpts,
          {},
          {
            emitter: this.rootEmitter.scoped(
              ['event::editor:reload-editor', 'event::file:force-update'],
              this.commonOpts.rootAbortSignal,
            ),
          },
        ),
      configure: (editorService) => {
        editorService.setInitConfig({ dummyVal: '' });
      },
    });
  }

  getServices(): CoreServices {
    return {
      commandDispatcher: this.coreCommandDispatchService(),
      commandRegistry: this.coreCommandRegistryService(),
      editorService: this.coreEditorService(),
      fileSystem: this.coreFileSystemService(),
      navigation: this.coreNavigationService(),
      shortcut: this.coreShortcutService(),
      userActivityService: this.coreUserActivityService(),
      workbench: this.coreWorkbenchService(),
      workbenchState: this.coreWorkbenchStateService(),
      workspace: this.coreWorkspaceService(),
      workspaceOps: this.coreWorkspaceOpsService(),
      workspaceState: this.coreWorkspaceStateService(),
    };
  }

  dispose() {
    this.factory.disposeAll();
  }
}
