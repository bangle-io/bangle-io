import {
  type BaseService,
  getEventSenderMetadata,
  throwAppError,
} from '@bangle.io/base-utils';
import {
  CommandDispatchService,
  CommandRegistryService,
  EditorService, // Added import
  FileSystemService,
  NavigationService,
  ShortcutService,
  type ShortcutServiceConfig,
  UserActivityService, // Added import
  WorkbenchService,
  WorkbenchStateService,
  WorkspaceOpsService,
  WorkspaceService,
  WorkspaceStateService,
} from '@bangle.io/service-core';

import {} from '@bangle.io/initialize-services';
import { BrowserErrorHandlerService } from '@bangle.io/service-platform'; // Added mock or adjusted initialization if needed
// use direct paths to avoid loading page-lifecycle
import { FileStorageMemory } from '@bangle.io/service-platform/src/file-storage-memory';
import { MemoryDatabaseService } from '@bangle.io/service-platform/src/memory-database';
import { MemoryRouterService } from '@bangle.io/service-platform/src/memory-router';
import { MemorySyncDatabaseService } from '@bangle.io/service-platform/src/memory-sync-database';
import { NodeErrorHandlerService } from '@bangle.io/service-platform/src/node-error-handler';

import type { ThemeManager } from '@bangle.io/color-scheme-manager';
import { THEME_MANAGER_CONFIG } from '@bangle.io/constants';
import {
  type CoreServices,
  type PlatformServices,
  Services,
  type Store,
} from '@bangle.io/types';
import { vi } from 'vitest';
export type { Store } from '@bangle.io/types';
import { Logger } from '@bangle.io/logger';
import type {
  BaseFileStorageService,
  BaseServiceCommonOptions,
} from '@bangle.io/types';
export { default as waitForExpect } from 'wait-for-expect';
import { getEnabledCommands } from '@bangle.io/commands';
import { RootEmitter } from '@bangle.io/root-emitter';
import { createStore } from 'jotai';
export * from './test-service-setup';
import { commandHandlers } from '@bangle.io/command-handlers';
import {
  CoreServiceManager,
  ServiceFactory,
} from '@bangle.io/initialize-services/src/initialize-services';
import { platformServicesSetup } from './platform-service-setup';

export type MockLog = ReturnType<typeof createMockLogger>;

const createMockLogger = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

export const sleep = (ms = 15): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface TestEnvironment {
  logger: Logger;
  mockLog: MockLog;
  controller: AbortController;
  rootEmitter: RootEmitter;
  commonOpts: BaseServiceCommonOptions;
  factory: ServiceFactory;
  platformServices: PlatformServices;
  platformConfigure: () => void;
  initAll: () => void;
}

// Add theme manager mock near the top of the file with other imports
const themeManager = {
  currentPreference: THEME_MANAGER_CONFIG.defaultPreference,
  onThemeChange: () => () => {},
  setPreference: () => {},
  currentTheme: THEME_MANAGER_CONFIG.lightThemeClass,
} as unknown as ThemeManager;

export function createTestEnvironment({
  controller = new AbortController(),
}: {
  controller?: AbortController;
} = {}): TestEnvironment {
  const mockLog = createMockLogger();
  const logger = new Logger('', 'debug', mockLog as any);
  const rootEmitter = new RootEmitter({ abortSignal: controller.signal });

  const commonOpts: BaseServiceCommonOptions = {
    logger,
    store: createStore(),
    emitAppError: vi.fn(),
    rootAbortSignal: controller.signal,
  };

  const factory = new ServiceFactory();
  const platform = platformServicesSetup(commonOpts, rootEmitter);

  return {
    platformServices: platform.services,
    platformConfigure: platform.configure,
    logger,
    mockLog,
    controller,
    rootEmitter,
    commonOpts,
    factory,
    initAll: () => {
      factory.configure();
      factory.initAll();
    },
  };
}

export class TestServiceInitializer extends CoreServiceManager {
  constructor(env: TestEnvironment) {
    super(
      env.factory,
      env.commonOpts,
      env.platformServices,
      env.rootEmitter,
      getEnabledCommands(),
      commandHandlers,
      themeManager,
    );
  }
}
