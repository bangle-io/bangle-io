import { assertIsDefined } from '@bangle.io/base-utils';
import type { ThemeManager } from '@bangle.io/color-scheme-manager';
import type { EnabledBangleAppCommand } from '@bangle.io/commands';
import type { CoreServices, EditorEngineContract } from '@bangle.io/context';
import {
  type ConstructorConfig,
  type ConstructorToInstance,
  Container,
  type ServiceConstructor,
  type ServiceContext,
  type ServiceMapEntry,
  type ServiceSlot,
  type SlotClass,
  slot,
  type ValidateServiceMap,
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
  CommandHandler,
  CoreServiceSlotId,
  RootEmitter,
} from '@bangle.io/types';

type AnyAppServiceConstructor = ServiceConstructor<
  BaseServiceCommonOptions,
  any,
  any
>;
type AppServiceMapEntry = ServiceMapEntry<BaseServiceCommonOptions>;

/**
 * The canonical core service classes, minus the editor engine. Every
 * composition root (browser and test) gets exactly these core services;
 * `createServiceSetup` pairs each class with its config, so callers supply
 * only platform slots plus the `editorEngine` class. The engine is the one
 * deliberately open slot: each composition root decides which implementation
 * powers the editing surface (plans/011), and production dynamic-imports only
 * the active engine so the inactive stack never loads.
 */
export const coreServiceClasses = {
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
} satisfies Record<
  Exclude<CoreServiceSlotId, 'editorEngine'>,
  AnyAppServiceConstructor
>;

type CoreServiceClassMap = typeof coreServiceClasses;

/**
 * A registrable editor engine: a config-less service class whose instances
 * satisfy `EditorEngineContract` and whose dependencies resolve within the
 * core slots — an engine talks to the platform through core services, never
 * through platform slots directly (that also keeps the platform-requirements
 * derivation below independent of the chosen engine).
 */
type EditorEngineServiceConstructor<TClass> =
  TClass extends AnyAppServiceConstructor
    ? InstanceType<TClass> extends EditorEngineContract
      ? TClass extends { readonly deps: readonly CoreServiceSlotId[] }
        ? TClass
        : never
      : never
    : never;

type EditorEngineGraph<TEditorEngine> = CoreServiceClassMap & {
  editorEngine: EditorEngineServiceConstructor<TEditorEngine>;
};

type ValidatedEditorEngine<TEditorEngine> = ValidateServiceMap<
  BaseServiceCommonOptions,
  EditorEngineGraph<TEditorEngine>
>['editorEngine'];

export type ValidatedEditorEngineServiceConstructor<TEditorEngine> =
  TEditorEngine &
    EditorEngineServiceConstructor<TEditorEngine> &
    ValidatedEditorEngine<TEditorEngine>;

/**
 * A platform service map supplies environment-specific slots only; core slot
 * ids are owned by `createServiceSetup` and cannot be shadowed (enforced on
 * the `platformServices` option via `NoCoreSlotCollisions`).
 */
export type PlatformServiceMap = Record<string, AppServiceMapEntry>;

type NoCoreSlotCollisions<TPlatformMap extends PlatformServiceMap> =
  Extract<keyof TPlatformMap, CoreServiceSlotId> extends never
    ? unknown
    : never;

type UnionToIntersection<U> = (
  U extends unknown
    ? (arg: U) => void
    : never
) extends (arg: infer I) => void
  ? I
  : never;

type DependenciesOf<TClass> = TClass extends abstract new (
  context: any,
  dependencies: infer TDeps,
  ...rest: any[]
) => unknown
  ? TDeps extends Record<string, unknown>
    ? TDeps
    : Record<never, never>
  : Record<never, never>;

type CoreDependencyContracts = UnionToIntersection<
  {
    [K in keyof CoreServiceClassMap]: DependenciesOf<CoreServiceClassMap[K]>;
  }[keyof CoreServiceClassMap]
>;

/**
 * The platform contracts that core services collectively depend on (derived
 * from their constructor dependency types). A platform map that omits one of
 * these slots, or registers an implementation that does not satisfy the
 * contract, fails to type-check at the composition root.
 */
type PlatformRequirements = Omit<CoreDependencyContracts, CoreServiceSlotId>;

/**
 * When the platform map does not provide every contract core services need,
 * this resolves to `never`, so the `platformServices` option fails to
 * type-check. Compare the map against `PlatformRequirements` to find the
 * missing or mistyped slot.
 */
type SatisfiesPlatformRequirements<TPlatformMap extends PlatformServiceMap> =
  ConstructorToInstance<TPlatformMap> extends PlatformRequirements
    ? unknown
    : never;

/**
 * Compile-time lock on the canonical core graph: static deps must match
 * constructor dependency keys, dependencies must resolve within the core
 * slots plus the derived platform contracts, and every config-requiring core
 * class must be one `createServiceSetup` attaches a config to. If this alias
 * errors, a core service declaration drifted.
 */
type AsCheckedEntry<TClass extends AnyAppServiceConstructor> =
  TClass extends new (
    context: any,
    dependencies: any,
  ) => any
    ? TClass
    : ServiceSlot<TClass>;

type ContractConstructor<TService> = new (
  context: { ctx: BaseServiceCommonOptions; serviceContext: ServiceContext },
  dependencies: null,
  config?: any,
) => TService;

type CoreGraphCheckMap = {
  [K in keyof CoreServiceClassMap]: AsCheckedEntry<CoreServiceClassMap[K]>;
} & {
  [K in keyof PlatformRequirements]: ContractConstructor<
    PlatformRequirements[K]
  >;
};

type AssertTrue<T extends true> = T;
type _AssertValidCoreGraph = AssertTrue<
  CoreGraphCheckMap extends ValidateServiceMap<
    BaseServiceCommonOptions,
    CoreGraphCheckMap
  >
    ? true
    : false
>;

/**
 * Core slots that carry a config and therefore accept a config override.
 * The editor engine is excluded by construction: engines are config-less
 * classes (see `EditorEngineServiceConstructor`).
 */
type ConfiguredCoreSlotId = {
  [K in keyof CoreServiceClassMap]: CoreServiceClassMap[K] extends new (
    context: any,
    dependencies: any,
  ) => any
    ? never
    : K;
}[keyof CoreServiceClassMap];

/**
 * Per-slot decorators over the canonical core configs, applied at the single
 * composition point. Tests use these to tune a core service (for example
 * activity cooldowns) while keeping the production wiring as the base.
 */
export type CoreConfigOverrides = {
  [K in ConfiguredCoreSlotId]?: (
    base: ConstructorConfig<CoreServiceClassMap[K]>,
  ) => ConstructorConfig<CoreServiceClassMap[K]>;
};

/** Platform slots whose instances act as file storage providers. */
type FileStorageSlot<TPlatformMap extends PlatformServiceMap> = {
  [K in keyof TPlatformMap & string]: InstanceType<
    SlotClass<TPlatformMap[K]>
  > extends BaseFileStorageService
    ? K
    : never;
}[keyof TPlatformMap & string];

export type ServiceSetupOptions<
  TPlatformMap extends PlatformServiceMap,
  TEditorEngine,
> = {
  commonOpts: BaseServiceCommonOptions;
  rootEmitter: RootEmitter;
  commands: EnabledBangleAppCommand[];
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
  /**
   * Environment-specific platform slots. Validated at the call site: platform
   * dependencies must resolve within this map, a service whose constructor
   * requires a config must be registered via `slot()`, and the map must
   * provide every contract in `PlatformRequirements`.
   */
  platformServices: TPlatformMap &
    ValidateServiceMap<BaseServiceCommonOptions, TPlatformMap> &
    SatisfiesPlatformRequirements<TPlatformMap> &
    NoCoreSlotCollisions<TPlatformMap>;
  /**
   * Which platform slots provide file storage. After instantiation they are
   * keyed by their `workspaceType` and served to `FileSystemService`.
   */
  fileStorageSlots: ReadonlyArray<FileStorageSlot<TPlatformMap>>;
  /**
   * The editor engine powering the editing surface. Consumers only ever see
   * the `EditorEngineContract` slot; the class registered here is the single
   * point deciding which engine a tab runs (plans/011). The browser
   * composition root resolves it from the persisted preference via dynamic
   * import; tests pass an engine class directly.
   */
  editorEngine: ValidatedEditorEngineServiceConstructor<TEditorEngine>;
  /** Optional per-slot decorators over the canonical core configs. */
  coreConfigOverrides?: CoreConfigOverrides;
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
 * The core service instances, independent of any platform map. Core config
 * factories are typed against this so their closures cannot create a type
 * cycle with the combined service map. The engine instance is only ever the
 * contract — concrete engine types stay inside their own package.
 */
type CoreInstances = ConstructorToInstance<CoreServiceClassMap> & {
  editorEngine: EditorEngineContract;
};

function toCoreServices(s: CoreInstances): CoreServices {
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
    editorEngine: s.editorEngine,
  } satisfies CoreServices;
}

/**
 * Builds the app service container shared by the browser composition root and
 * the test composition root. It owns the core service slots and every
 * environment-independent config; callers supply only the platform slots
 * (with their configs attached via `slot()`) and optional core config
 * overrides. The resulting map is the complete composition — there is no
 * post-construction mutation phase.
 */
export function createServiceSetup<
  const TPlatformMap extends PlatformServiceMap,
  const TEditorEngine,
>(options: ServiceSetupOptions<TPlatformMap, TEditorEngine>) {
  const {
    commonOpts,
    rootEmitter,
    commands,
    commandHandlers,
    themeManager,
    shortcutTarget,
    fileStorageSlots,
    editorEngine,
    coreConfigOverrides,
  } = options;
  const platformServices: TPlatformMap = options.platformServices;

  let fileStorageServices: Record<string, BaseFileStorageService> | undefined;

  function withOverride<K extends ConfiguredCoreSlotId>(
    key: K,
    base: () => ConstructorConfig<CoreServiceClassMap[K]>,
  ): () => ConstructorConfig<CoreServiceClassMap[K]> {
    return () => {
      const override = coreConfigOverrides?.[key];
      const config = base();
      return override ? override(config) : config;
    };
  }

  const coreServiceSlots = {
    commandDispatcher: slot(
      CommandDispatchService,
      withOverride('commandDispatcher', () => ({
        emitResult: (result) => {
          rootEmitter.emit('event::command:result', result);
        },
        focusEditor: () => {
          getCoreInstances().editorEngine.focusEditor();
        },
        // Hand the dispatcher only the command-exposed core slots; platform
        // services must stay unreachable from command handlers even at runtime.
        getExposedServices: () => {
          const {
            commandDispatcher: _commandDispatcher,
            commandRegistry: _commandRegistry,
            ...exposed
          } = toCoreServices(getCoreInstances());
          return exposed;
        },
      })),
    ),
    commandRegistry: slot(
      CommandRegistryService,
      withOverride('commandRegistry', () => ({
        commands,
        commandHandlers,
      })),
    ),
    fileSystem: slot(
      FileSystemService,
      withOverride('fileSystem', () => ({
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
      })),
    ),
    navigation: slot(NavigationService),
    shortcut: slot(
      ShortcutService,
      withOverride('shortcut', () => ({
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
                getCoreInstances().commandDispatcher.dispatch(
                  command.id,
                  event,
                  `keyboard(${keys})`,
                );
              },
              options: {
                ...(command.allowShortcutInInputs
                  ? { allowInInput: true }
                  : {}),
                unique: true,
              },
            };
          }),
      })),
    ),
    editorService: slot(
      EditorService,
      withOverride('editorService', () => ({
        emitter: rootEmitter.scoped(
          ['event::editor:reload-editor', 'event::file:force-update'],
          commonOpts.rootAbortSignal,
        ),
      })),
    ),
    workbench: slot(WorkbenchService),
    workbenchState: slot(
      WorkbenchStateService,
      withOverride('workbenchState', () => ({
        themeManager,
        emitter: rootEmitter.scoped(
          ['event::app:reload-ui'],
          commonOpts.rootAbortSignal,
        ),
      })),
    ),
    workspace: slot(WorkspaceService),
    workspaceOps: slot(WorkspaceOpsService),
    workspaceState: slot(WorkspaceStateService),
    userActivityService: slot(
      UserActivityService,
      withOverride('userActivityService', () => ({
        emitter: rootEmitter.scoped(
          ['event::command:result'],
          commonOpts.rootAbortSignal,
        ),
      })),
    ),
    editorEngine,
  } satisfies Record<CoreServiceSlotId, AppServiceMapEntry>;

  // Core slots always win the join; the annotation drops any phantom core
  // keys the generic platform map could contribute type-wise (a real
  // collision is rejected by `NoCoreSlotCollisions`).
  const serviceMap: Omit<TPlatformMap, CoreServiceSlotId> &
    typeof coreServiceSlots = Object.assign(
    {},
    platformServices,
    coreServiceSlots,
  );
  // Instantiated per part (rather than over `typeof serviceMap`) so indexing
  // a core slot resolves against the concrete core map instead of collapsing
  // into a union with the generic platform map's entry type.
  type ServiceInstances = ConstructorToInstance<
    Omit<TPlatformMap, CoreServiceSlotId>
  > &
    ConstructorToInstance<typeof coreServiceSlots>;

  let services: ServiceInstances | undefined;

  const getServices = (): ServiceInstances => {
    assertIsDefined(services, 'services (instantiate() has not been called)');
    return services;
  };

  const getCoreInstances = (): CoreInstances => {
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
      editorEngine: s.editorEngine,
    };
  };

  const container = new Container(
    {
      context: commonOpts,
      abortSignal: commonOpts.rootAbortSignal,
    },
    serviceMap,
  );

  return {
    /**
     * Instantiates every service (or the focused subset plus its
     * dependencies). Must be called before services are accessed.
     */
    instantiate: (
      focus?: Array<keyof typeof serviceMap & string>,
    ): ServiceInstances => {
      services = container.instantiateAll(focus);

      fileStorageServices = {};
      const instancesBySlot = new Map<string, unknown>(
        Object.entries(services),
      );
      const slotByWorkspaceType = new Map<string, string>();
      for (const storageSlot of fileStorageSlots) {
        const storage: unknown = instancesBySlot.get(storageSlot);
        if (!isFileStorageService(storage)) {
          throw new Error(
            `Service slot "${storageSlot}" does not implement the file storage contract.`,
          );
        }
        const existingSlot = slotByWorkspaceType.get(storage.workspaceType);
        if (existingSlot) {
          throw new Error(
            `File storage slots "${existingSlot}" and "${storageSlot}" both claim workspace type "${storage.workspaceType}".`,
          );
        }
        slotByWorkspaceType.set(storage.workspaceType, storageSlot);
        fileStorageServices[storage.workspaceType] = storage;
      }

      return services;
    },

    /** Access instantiated services; throws before `instantiate()`. */
    getServices,

    /** The typed core-facing service aggregate consumed by React. */
    coreServices: (): CoreServices => toCoreServices(getCoreInstances()),

    mountAll: async (): Promise<void> => {
      commonOpts.logger.debug('Service graph', container.describe());
      await container.mountAll();
    },

    describe: () => container.describe(),
  };
}
