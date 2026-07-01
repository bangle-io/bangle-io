import {
  assertIsDefined,
  getEventSenderMetadata,
  throwAppError,
} from '@bangle.io/base-utils';
import type { ThemeManager } from '@bangle.io/color-scheme-manager';
import type { CoreServices } from '@bangle.io/context';
import { PmEditorService } from '@bangle.io/editor';
import { type ConstructorToInstance, Container } from '@bangle.io/poor-mans-di';
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
import {
  BrowserErrorHandlerService,
  BrowserLocalStorageSyncDatabaseService,
  BrowserRouterService,
  FileStorageIndexedDB,
  FileStorageNativeFs,
  HashStrategy,
  IdbDatabaseService,
} from '@bangle.io/service-platform';
import type {
  BaseFileStorageService,
  BaseServiceCommonOptions,
  Command,
  CommandHandler,
  RootEmitter,
} from '@bangle.io/types';

const browserServiceMap = {
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
};

type BrowserServiceInstances = ConstructorToInstance<typeof browserServiceMap>;

export function initializeServices(
  commonOpts: BaseServiceCommonOptions,
  rootEmitter: RootEmitter,
  commands: Command[],
  commandHandlers: Array<{ id: string; handler: CommandHandler }>,
  theme: ThemeManager,
) {
  let services: BrowserServiceInstances;
  let fileStorageServices: Record<string, BaseFileStorageService>;
  const container = new Container(
    {
      context: commonOpts,
      abortSignal: commonOpts.rootAbortSignal,
    },
    browserServiceMap,
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
    focusEditor: () => {
      services.pmEditorService.focusEditor();
    },
    getExposedServices: () => services,
  }));

  container.setConfig(FileSystemService, () => ({
    emitter: rootEmitter.scoped(
      ['event::file:update', 'event::file:force-update'],
      commonOpts.rootAbortSignal,
    ),
    getFileStorageServices: () => fileStorageServices,
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
    getRootDirHandle: async (wsName: string) => {
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
    },
  }));

  container.setConfig(PmEditorService, () => ({
    nothing: true,
  }));

  services = container.instantiateAll();

  fileStorageServices = {
    [services.fileStorageIdb.workspaceType]: services.fileStorageIdb,
    [services.fileStorageNativeFs.workspaceType]: services.fileStorageNativeFs,
  };

  return {
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
      commonOpts.logger.debug('Service graph', container.describe());
      return container.mountAll();
    },
    describe: () => container.describe(),
  };
}
