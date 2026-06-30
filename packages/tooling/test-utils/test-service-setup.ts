import type { ThemeManager } from '@bangle.io/color-scheme-manager';
import { THEME_MANAGER_CONFIG } from '@bangle.io/constants';
import {
  CommandDispatchService,
  CommandRegistryService,
  EditorService,
  FileSystemService,
  NavigationService,
  ShortcutService,
  UserActivityService,
  WorkbenchService,
  WorkbenchStateService,
  WorkspaceOpsService,
  WorkspaceService,
  WorkspaceStateService,
} from '@bangle.io/service-core';
import {
  FileStorageMemory,
  MemoryDatabaseService,
  MemoryRouterService,
  MemorySyncDatabaseService,
  TestErrorHandlerService,
} from '@bangle.io/service-platform/testing';

import { vi } from 'vitest';

export type { Store } from '@bangle.io/types';

import type { Store } from '@bangle.io/types';

export { default as waitForExpect } from 'wait-for-expect';

import { getEnabledCommands } from '@bangle.io/commands';

export * from './test-service-setup';

import { commandHandlers } from '@bangle.io/command-handlers';
import { PmEditorService } from '@bangle.io/editor';
import { type ConstructorToInstance, Container } from '@bangle.io/poor-mans-di';
import { makeTestCommonOpts } from './common-opts';

const themeManager = {
  currentPreference: THEME_MANAGER_CONFIG.defaultPreference,
  onThemeChange: () => () => {},
  setPreference: () => {},
  currentTheme: THEME_MANAGER_CONFIG.lightThemeClass,
} as unknown as ThemeManager;

/**
 * Creates a fully configured test environment with mock services and configuration.
 * This can be used in tests to simulate the application environment, including
 * in-memory databases, file systems, and router services.
 */
export function createTestEnvironment({
  controller = new AbortController(),
}: {
  controller?: AbortController;
} = {}) {
  const { commonOpts, mockLog, rootEmitter } = makeTestCommonOpts({
    controller,
  });

  // Platform-specific service mappings to in-memory / mock equivalents.
  const platformServicesMap = {
    errorService: TestErrorHandlerService,
    database: MemoryDatabaseService,
    syncDatabase: MemorySyncDatabaseService,
    fileStorageMemory: FileStorageMemory,
    router: MemoryRouterService,
  };

  // Core services that rely on the platform services above.
  const coreServicesMap = {
    commandDispatcher: CommandDispatchService,
    commandRegistry: CommandRegistryService,
    fileSystem: FileSystemService,
    navigation: NavigationService,
    editorService: EditorService,
    shortcut: ShortcutService,
    workbench: WorkbenchService,
    workbenchState: WorkbenchStateService,
    workspace: WorkspaceService,
    workspaceOps: WorkspaceOpsService,
    workspaceState: WorkspaceStateService,
    userActivityService: UserActivityService,
    pmEditorService: PmEditorService,
  };

  const serviceMap = {
    ...platformServicesMap,
    ...coreServicesMap,
  };

  type ServiceMapType = typeof serviceMap;
  type TestServiceInstances = ConstructorToInstance<ServiceMapType>;
  let currentServices: TestServiceInstances;
  let fileStorageServices: Record<
    string,
    TestServiceInstances['fileStorageMemory']
  >;

  const container = new Container(
    {
      context: commonOpts,
      abortSignal: controller.signal,
    },
    serviceMap,
  );

  const result = {
    logger: commonOpts.logger,
    mockLog,
    controller,
    rootEmitter,
    commonOpts,
    store: commonOpts.store as Store,

    /**
     * Sets default configurations for various services, including event emitters
     * and command registries. This allows tests to simulate common scenarios.
     */
    setDefaultConfig: () => {
      container.setConfig(ShortcutService, () => ({
        target: {
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
        shortcuts: [],
      }));

      container.setConfig(FileStorageMemory, () => ({
        onChange: (change) => {
          commonOpts.logger.info('File storage change:', change);
        },
      }));

      // Core service configs
      container.setConfig(CommandRegistryService, () => ({
        commands: getEnabledCommands(),
        commandHandlers,
      }));

      container.setConfig(CommandDispatchService, () => ({
        emitResult: (result) => {
          rootEmitter.emit('event::command:result', result);
        },
        focusEditor: () => {},
        getExposedServices: () => currentServices,
      }));

      container.setConfig(FileSystemService, () => ({
        emitter: rootEmitter.scoped(
          ['event::file:update', 'event::file:force-update'],
          controller.signal,
        ),
        getFileStorageServices: () => fileStorageServices,
      }));

      container.setConfig(UserActivityService, () => ({
        emitter: rootEmitter.scoped(
          ['event::command:result'],
          controller.signal,
        ),
      }));

      container.setConfig(WorkbenchStateService, () => ({
        themeManager,
        emitter: rootEmitter.scoped(
          ['event::app:reload-ui'],
          controller.signal,
        ),
      }));

      container.setConfig(EditorService, () => ({
        emitter: rootEmitter.scoped(
          ['event::editor:reload-editor', 'event::file:force-update'],
          controller.signal,
        ),
      }));

      container.setConfig(PmEditorService, () => ({
        nothing: true,
      }));

      return result;
    },

    /**
     * Returns the DI container holding all services.
     */
    getContainer: () => container,

    /**
     * Mounts all services. Useful for ensuring all asynchronous initialization
     * completes before running tests.
     */
    mountAll: async () => {
      await container.mountAll();
    },

    /**
     * Instantiates all services, optionally focusing on a particular service.
     * This is helpful if you want to bring up only a subset of services in tests.
     */
    instantiateAll: (focusService?: keyof typeof serviceMap) => {
      const focuses = focusService
        ? // always instantiate platform services plus the focused one
          [...Object.keys(platformServicesMap), focusService]
        : undefined;

      currentServices = container.instantiateAll(focuses as any[]);

      fileStorageServices = {
        [currentServices.fileStorageMemory.workspaceType]:
          currentServices.fileStorageMemory,
      };

      return currentServices;
    },
  };

  return result;
}
