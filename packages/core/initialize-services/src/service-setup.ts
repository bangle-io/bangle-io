import { assertIsDefined } from '@bangle.io/base-utils';
import type { ThemeManager } from '@bangle.io/color-scheme-manager';
import type { CoreServices } from '@bangle.io/context';
import { PmEditorService } from '@bangle.io/editor';
import {
  type ConstructorToInstance,
  Container,
  type ServiceConstructor,
} from '@bangle.io/poor-mans-di';
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
  BaseFileStorageService,
  BaseServiceCommonOptions,
  Command,
  CommandHandler,
  CoreServiceSlotId,
  RootEmitter,
} from '@bangle.io/types';

/**
 * The canonical core service slot map. Every composition root (browser and
 * test) instantiates exactly these core services; only the platform slots
 * differ per environment.
 */
export const coreServiceMap = {
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
} satisfies Record<
  CoreServiceSlotId,
  ServiceConstructor<BaseServiceCommonOptions, any>
>;

type PlatformServiceMap = Record<
  string,
  ServiceConstructor<BaseServiceCommonOptions, any>
>;

/** Platform slots whose instances act as file storage providers. */
type FileStorageSlot<TPlatform extends PlatformServiceMap> = {
  [K in keyof TPlatform & string]: InstanceType<
    TPlatform[K]
  > extends BaseFileStorageService
    ? K
    : never;
}[keyof TPlatform & string];

export type ServiceSetupOptions<TPlatform extends PlatformServiceMap> = {
  commonOpts: BaseServiceCommonOptions;
  rootEmitter: RootEmitter;
  commands: Command[];
  commandHandlers: Array<{ id: string; handler: CommandHandler }>;
  themeManager: ThemeManager;
  /**
   * Keyboard shortcut event target. `document` in the browser; a stub in
   * tests. Shortcuts are always derived from `commands` keybindings so test
   * wiring mirrors production wiring.
   */
  shortcutTarget: {
    addEventListener: Document['addEventListener'];
    removeEventListener: Document['removeEventListener'];
  };
  /** Environment-specific platform service slots. */
  platformServices: TPlatform;
  /**
   * Which platform slots provide file storage. After instantiation they are
   * keyed by their `workspaceType` and served to `FileSystemService`.
   */
  fileStorageSlots: ReadonlyArray<FileStorageSlot<TPlatform>>;
};

function isFileStorageService(
  service: unknown,
): service is BaseFileStorageService {
  return (
    typeof service === 'object' &&
    service !== null &&
    typeof (service as { workspaceType?: unknown }).workspaceType === 'string'
  );
}

/**
 * Builds the app service container shared by the browser composition root and
 * the test composition root. It owns the core service slot map and every
 * environment-independent service config. Callers add platform-specific
 * configs via `container.setConfig` before calling `instantiate()`.
 */
export function createServiceSetup<TPlatform extends PlatformServiceMap>(
  options: ServiceSetupOptions<TPlatform>,
) {
  const {
    commonOpts,
    rootEmitter,
    commands,
    commandHandlers,
    themeManager,
    shortcutTarget,
    platformServices,
    fileStorageSlots,
  } = options;

  const serviceMap = {
    ...platformServices,
    ...coreServiceMap,
  };
  type ServiceInstances = ConstructorToInstance<typeof serviceMap>;

  let services: ServiceInstances | undefined;
  let fileStorageServices: Record<string, BaseFileStorageService> | undefined;

  const getServices = (): ServiceInstances => {
    assertIsDefined(services, 'services (instantiate() has not been called)');
    return services;
  };

  const container = new Container(
    {
      context: commonOpts,
      abortSignal: commonOpts.rootAbortSignal,
    },
    serviceMap,
  );

  container.setConfig(CommandRegistryService, () => ({
    commands,
    commandHandlers,
  }));

  container.setConfig(CommandDispatchService, () => ({
    emitResult: (result) => {
      rootEmitter.emit('event::command:result', result);
    },
    focusEditor: () => {
      getServices().pmEditorService.focusEditor();
    },
    getExposedServices: () => getServices(),
  }));

  container.setConfig(FileSystemService, () => ({
    emitter: rootEmitter.scoped(
      ['event::file:update', 'event::file:force-update'],
      commonOpts.rootAbortSignal,
    ),
    getFileStorageServices: () => {
      assertIsDefined(
        fileStorageServices,
        'fileStorageServices (instantiate() has not been called)',
      );
      return fileStorageServices;
    },
  }));

  container.setConfig(ShortcutService, () => ({
    target: shortcutTarget,
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
            getServices().commandDispatcher.dispatch(
              command.id as any,
              event,
              `keyboard(${keys})`,
            );
          },
          options: {
            ...(command.allowShortcutInInputs ? { allowInInput: true } : {}),
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
    themeManager,
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

  container.setConfig(PmEditorService, () => ({
    nothing: true,
  }));

  return {
    container,

    /**
     * Instantiates every service (or the focused subset plus its
     * dependencies). Must be called before services are accessed.
     */
    instantiate: (
      focus?: Array<keyof typeof serviceMap & string>,
    ): ServiceInstances => {
      services = container.instantiateAll(focus);

      fileStorageServices = {};
      for (const slot of fileStorageSlots) {
        const storage: unknown = services[slot];
        if (!isFileStorageService(storage)) {
          throw new Error(
            `Service slot "${slot}" does not implement the file storage contract.`,
          );
        }
        fileStorageServices[storage.workspaceType] = storage;
      }

      return services;
    },

    /** Access instantiated services; throws before `instantiate()`. */
    getServices,

    /** The typed core-facing service aggregate consumed by React. */
    coreServices: (): CoreServices => {
      const s = getServices();
      return {
        commandDispatcher: s.commandDispatcher,
        commandRegistry: s.commandRegistry,
        fileSystem: s.fileSystem,
        navigation: s.navigation,
        shortcut: s.shortcut,
        editorService: s.editorService,
        workbench: s.workbench,
        workbenchState: s.workbenchState,
        workspace: s.workspace,
        workspaceOps: s.workspaceOps,
        workspaceState: s.workspaceState,
        userActivityService: s.userActivityService,
        pmEditorService: s.pmEditorService,
      } satisfies CoreServices;
    },

    mountAll: async (): Promise<void> => {
      commonOpts.logger.debug('Service graph', container.describe());
      await container.mountAll();
    },

    describe: () => container.describe(),
  };
}
