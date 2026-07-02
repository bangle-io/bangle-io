import type { ThemeManager } from '@bangle.io/color-scheme-manager';
import { commandHandlers } from '@bangle.io/command-handlers';
import { getEnabledCommands } from '@bangle.io/commands';
import {
  FileStorageMemory,
  MemoryDatabaseService,
  MemoryRouterService,
  MemorySyncDatabaseService,
  TestErrorHandlerService,
} from '@bangle.io/service-platform/testing';
import { makeTestCommonOpts } from '@bangle.io/test-utils';
import { describe, expect, test, vi } from 'vitest';
import { coreServiceMap, createServiceSetup } from '../service-setup';

const themeManager = {
  currentPreference: 'system',
  onThemeChange: () => () => {},
  setPreference: () => {},
  currentTheme: 'BU_light-scheme',
} as unknown as ThemeManager;

function makeSetup() {
  const controller = new AbortController();
  const { commonOpts, rootEmitter } = makeTestCommonOpts({ controller });

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
    platformServices: {
      errorService: TestErrorHandlerService,
      database: MemoryDatabaseService,
      syncDatabase: MemorySyncDatabaseService,
      fileStorageMemory: FileStorageMemory,
      router: MemoryRouterService,
    },
    fileStorageSlots: ['fileStorageMemory'],
  });

  setup.container.setConfig(FileStorageMemory, () => ({
    onChange: () => {},
  }));

  return { setup, controller };
}

describe('createServiceSetup', () => {
  test('service access before instantiate() fails loudly', () => {
    const { setup, controller } = makeSetup();

    expect(() => setup.getServices()).toThrow(/instantiate\(\)/);
    expect(() => setup.coreServices()).toThrow(/instantiate\(\)/);

    controller.abort();
  });

  test('instantiates, mounts, and reports a healthy service graph', async () => {
    const { setup, controller } = makeSetup();

    const services = setup.instantiate();
    const coreServices = setup.coreServices();

    // The core aggregate exposes exactly the canonical core slots.
    expect(Object.keys(coreServices).sort()).toEqual(
      Object.keys(coreServiceMap).sort(),
    );

    await setup.mountAll();

    const description = setup.describe();
    expect(description.failedSlot).toBeUndefined();
    expect(description.mountedCount).toBe(description.services.length);
    expect(description.services.length).toBe(
      Object.keys(coreServiceMap).length + 5,
    );

    // File storage slots are keyed by their workspace type for FileSystemService.
    expect(services.fileStorageMemory.mounted).toBe(true);

    controller.abort();
  });

  test('startup failure surfaces the slot id and phase', async () => {
    const { setup, controller } = makeSetup();

    setup.container.setConfig(FileStorageMemory, () => {
      throw new Error('boom');
    });

    expect(() => setup.instantiate()).toThrow(
      /Service "fileStorageMemory" failed during instantiate: boom/,
    );
    expect(setup.describe().failedSlot).toMatchObject({
      slotId: 'fileStorageMemory',
      phase: 'instantiate',
    });

    controller.abort();
  });
});
