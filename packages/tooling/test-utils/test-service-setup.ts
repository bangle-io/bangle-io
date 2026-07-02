import type { ThemeManager } from '@bangle.io/color-scheme-manager';
import { commandHandlers } from '@bangle.io/command-handlers';
import { getEnabledCommands } from '@bangle.io/commands';
import { THEME_MANAGER_CONFIG } from '@bangle.io/constants';
import type { CoreServices } from '@bangle.io/context';
import {
  coreServiceMap,
  createServiceSetup,
  defineAppServiceMap,
} from '@bangle.io/initialize-services/setup';
import type { ConstructorToInstance, Container } from '@bangle.io/poor-mans-di';
import {
  FileStorageMemory,
  MemoryDatabaseService,
  MemoryRouterService,
  MemorySyncDatabaseService,
  TestErrorHandlerService,
} from '@bangle.io/service-platform/testing';
import type { BaseServiceCommonOptions, Store } from '@bangle.io/types';
import { vi } from 'vitest';
import { type MockLog, makeTestCommonOpts } from './common-opts';

export type { Store } from '@bangle.io/types';

export { default as waitForExpect } from 'wait-for-expect';

export * from './test-service-setup';

const themeManager = {
  currentPreference: THEME_MANAGER_CONFIG.defaultPreference,
  onThemeChange: () => () => {},
  setPreference: () => {},
  currentTheme: THEME_MANAGER_CONFIG.lightThemeClass,
} as unknown as ThemeManager;

const platformServicesMap = {
  errorService: TestErrorHandlerService,
  database: MemoryDatabaseService,
  syncDatabase: MemorySyncDatabaseService,
  fileStorageMemory: FileStorageMemory,
  router: MemoryRouterService,
};

const serviceMap = defineAppServiceMap({
  ...platformServicesMap,
  ...coreServiceMap,
});

type TestServiceMap = typeof serviceMap;
type TestServices = ConstructorToInstance<TestServiceMap>;
type TestContainer = Container<BaseServiceCommonOptions, TestServiceMap>;

export type TestEnvironment = {
  logger: ReturnType<typeof makeTestCommonOpts>['commonOpts']['logger'];
  mockLog: MockLog;
  controller: AbortController;
  rootEmitter: ReturnType<typeof makeTestCommonOpts>['rootEmitter'];
  commonOpts: ReturnType<typeof makeTestCommonOpts>['commonOpts'];
  store: Store;
  getContainer: () => TestContainer;
  coreServices: () => CoreServices;
  mountAll: () => Promise<void>;
  instantiateAll: (focusService?: keyof TestServices & string) => TestServices;
};

/**
 * Creates a fully configured test environment with in-memory platform
 * services. Core wiring comes from the same `createServiceSetup` builder the
 * browser composition root uses, so test setup mirrors production setup.
 */
export function createTestEnvironment({
  controller = new AbortController(),
}: {
  controller?: AbortController;
} = {}): TestEnvironment {
  const { commonOpts, mockLog, rootEmitter } = makeTestCommonOpts({
    controller,
  });

  const setup = createServiceSetup({
    commonOpts,
    rootEmitter,
    commands: getEnabledCommands(),
    commandHandlers,
    themeManager,
    shortcutTarget: {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    serviceMap,
    fileStorageSlots: ['fileStorageMemory'],
  });

  setup.container.setConfig(FileStorageMemory, () => ({
    onChange: (change) => {
      commonOpts.logger.info('File storage change:', change);
    },
  }));

  return {
    logger: commonOpts.logger,
    mockLog,
    controller,
    rootEmitter,
    commonOpts,
    store: commonOpts.store as Store,

    /**
     * Returns the DI container holding all services. Tests can override
     * individual service configs before calling `instantiateAll()`.
     */
    getContainer: () => setup.container,

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
    instantiateAll: (
      focusService?: NonNullable<
        Parameters<typeof setup.instantiate>[0]
      >[number],
    ) => {
      const focuses = focusService
        ? // always instantiate platform services plus the focused one
          [
            ...(Object.keys(platformServicesMap) as Array<
              keyof typeof platformServicesMap
            >),
            focusService,
          ]
        : undefined;

      return setup.instantiate(focuses);
    },
  };
}
