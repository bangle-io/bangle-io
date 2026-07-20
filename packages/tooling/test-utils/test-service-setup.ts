import type { ThemeManager } from '@bangle.io/color-scheme-manager';
import { commandHandlers as defaultCommandHandlers } from '@bangle.io/command-handlers';
import { getEnabledCommands } from '@bangle.io/commands';
import {
  type EditorEngineId,
  THEME_MANAGER_CONFIG,
} from '@bangle.io/constants';
import type { CoreServices } from '@bangle.io/context';
import {
  type CoreConfigOverrides,
  createEditorSaveCoordinator,
  createServiceSetup,
} from '@bangle.io/initialize-services/setup';
import { type ContainerDescription, slot } from '@bangle.io/poor-mans-di';
import {
  FileStorageMemory,
  MemoryDatabaseService,
  MemoryRouterService,
  MemorySyncDatabaseService,
  TestErrorHandlerService,
} from '@bangle.io/service-platform/testing';
import type {
  BaseServiceCommonOptions,
  CommandHandler,
  Store,
} from '@bangle.io/types';
import { vi } from 'vitest';
import { type MockLog, makeTestCommonOpts } from './common-opts';

export type { Store } from '@bangle.io/types';

export { default as waitForExpect } from 'wait-for-expect';

const themeManager = {
  currentPreference: THEME_MANAGER_CONFIG.defaultPreference,
  onThemeChange: () => () => {},
  setPreference: () => {},
  currentTheme: THEME_MANAGER_CONFIG.lightThemeClass,
} as unknown as ThemeManager;

const PLATFORM_SLOT_IDS = [
  'errorService',
  'database',
  'syncDatabase',
  'fileStorageMemory',
  'router',
] as const;

type TestServices = CoreServices & {
  errorService: TestErrorHandlerService;
  database: MemoryDatabaseService;
  syncDatabase: MemorySyncDatabaseService;
  fileStorageMemory: FileStorageMemory;
  router: MemoryRouterService;
};

type TestServiceSetup = {
  instantiate: (focus?: Array<keyof TestServices & string>) => TestServices;
  getServices: () => TestServices;
  coreServices: () => CoreServices;
  mountAll: () => Promise<void>;
  describe: () => ContainerDescription;
};

function createTestServiceSetup(
  commonOpts: BaseServiceCommonOptions,
  rootEmitter: ReturnType<typeof makeTestCommonOpts>['rootEmitter'],
  commands: ReturnType<typeof getEnabledCommands>,
  commandHandlers: Array<{ id: string; handler: CommandHandler }>,
  coreConfigOverrides: CoreConfigOverrides | undefined,
  editorEngineId: EditorEngineId,
): TestServiceSetup {
  return createServiceSetup({
    commonOpts,
    rootEmitter,
    commands,
    commandHandlers,
    themeManager,
    shortcutTarget: {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    platformServices: {
      errorService: TestErrorHandlerService,
      database: MemoryDatabaseService,
      syncDatabase: MemorySyncDatabaseService,
      fileStorageMemory: slot(FileStorageMemory, () => ({
        onChange: (change) => {
          commonOpts.logger.info('File storage change:', change);
        },
      })),
      router: MemoryRouterService,
    },
    fileStorageSlots: ['fileStorageMemory'],
    editorEngineId,
    editorSaveCoordinator: createEditorSaveCoordinator(),
    coreConfigOverrides,
  });
}

export type TestEnvironment = {
  logger: ReturnType<typeof makeTestCommonOpts>['commonOpts']['logger'];
  mockLog: MockLog;
  controller: AbortController;
  rootEmitter: ReturnType<typeof makeTestCommonOpts>['rootEmitter'];
  commonOpts: ReturnType<typeof makeTestCommonOpts>['commonOpts'];
  store: Store;
  coreServices: () => CoreServices;
  mountAll: () => Promise<void>;
  instantiateAll: (focusService?: keyof TestServices & string) => TestServices;
};

/**
 * Creates a fully configured test environment with in-memory platform
 * services. Core wiring comes from the same `createServiceSetup` builder the
 * browser composition root uses, so test setup mirrors production setup.
 * Tests tune core services through `coreConfigOverrides` (decorators over the
 * canonical configs), or select the real editor implementation with
 * `editorEngineId`.
 */
export function createTestEnvironment({
  controller = new AbortController(),
  commands = getEnabledCommands(),
  commandHandlers = defaultCommandHandlers,
  coreConfigOverrides,
  editorEngineId = 'prosemirror',
}: {
  controller?: AbortController;
  commands?: ReturnType<typeof getEnabledCommands>;
  commandHandlers?: Array<{ id: string; handler: CommandHandler }>;
  coreConfigOverrides?: CoreConfigOverrides;
  editorEngineId?: EditorEngineId;
} = {}): TestEnvironment {
  const { commonOpts, mockLog, rootEmitter } = makeTestCommonOpts({
    controller,
  });

  const setup = createTestServiceSetup(
    commonOpts,
    rootEmitter,
    commands,
    commandHandlers,
    coreConfigOverrides,
    editorEngineId,
  );

  return {
    logger: commonOpts.logger,
    mockLog,
    controller,
    rootEmitter,
    commonOpts,
    store: commonOpts.store as Store,

    /**
     * The typed core-facing service aggregate, as consumed by React.
     * Throws if called before `instantiateAll()`.
     */
    coreServices: setup.coreServices,

    /**
     * Mounts all services. Useful for ensuring all asynchronous initialization
     * completes before running tests.
     */
    mountAll: setup.mountAll,

    /**
     * Instantiates all services, optionally focusing on a particular service.
     * This is helpful if you want to bring up only a subset of services in tests.
     */
    instantiateAll: (focusService?: keyof TestServices & string) => {
      const focuses = focusService
        ? // always instantiate platform services plus the focused one
          [...PLATFORM_SLOT_IDS, focusService]
        : undefined;

      return setup.instantiate(focuses);
    },
  };
}
