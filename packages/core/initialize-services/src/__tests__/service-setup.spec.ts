import type { ThemeManager } from '@bangle.io/color-scheme-manager';
import { commandHandlers } from '@bangle.io/command-handlers';
import { getEnabledCommands } from '@bangle.io/commands';
import { createEditorSaveCoordinator } from '@bangle.io/editor';
import { slot } from '@bangle.io/poor-mans-di';
import {
  FileStorageMemory,
  MemoryDatabaseService,
  MemoryRouterService,
  MemorySyncDatabaseService,
  TestErrorHandlerService,
} from '@bangle.io/service-platform/testing';
import { makeTestCommonOpts } from '@bangle.io/test-utils';
import { describe, expect, test, vi } from 'vitest';
import { coreServiceClasses, createServiceSetup } from '../service-setup';

const coreServiceSlotIds = [...Object.keys(coreServiceClasses), 'editorEngine'];

const themeManager = {
  currentPreference: 'system',
  onThemeChange: () => () => {},
  setPreference: () => {},
  currentTheme: 'BU_light-scheme',
} as unknown as ThemeManager;

function makeSetup({
  fileStorageConfig = () => ({ onChange: () => {} }),
}: {
  fileStorageConfig?: () => { onChange: () => void };
} = {}) {
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
      fileStorageMemory: slot(FileStorageMemory, fileStorageConfig),
      router: MemoryRouterService,
    },
    fileStorageSlots: ['fileStorageMemory'],
    editorEngineId: 'prosemirror',
    editorSaveCoordinator: createEditorSaveCoordinator(),
  });

  return { setup, controller };
}

describe('createServiceSetup', () => {
  test('service access before instantiate() fails loudly', () => {
    const { setup, controller } = makeSetup();

    expect(() => setup.getServices()).toThrow(/instantiate\(\)/);
    expect(() => setup.coreServices()).toThrow(/instantiate\(\)/);

    controller.abort();
  });

  test('rejects platform maps that do not satisfy the core requirements', () => {
    const controller = new AbortController();
    const { commonOpts, rootEmitter } = makeTestCommonOpts({ controller });

    createServiceSetup({
      commonOpts,
      rootEmitter,
      commands: [],
      commandHandlers: [],
      themeManager,
      shortcutTarget: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      // @ts-expect-error the platform map must provide every contract core
      // services depend on; omitting the router slot fails to type-check.
      platformServices: {
        errorService: TestErrorHandlerService,
        database: MemoryDatabaseService,
        syncDatabase: MemorySyncDatabaseService,
        fileStorageMemory: slot(FileStorageMemory, () => ({
          onChange: () => {},
        })),
      },
      fileStorageSlots: [],
      editorEngineId: 'prosemirror',
      editorSaveCoordinator: createEditorSaveCoordinator(),
    });

    controller.abort();
  });

  test('rejects a config-requiring platform service registered bare', () => {
    const controller = new AbortController();
    const { commonOpts, rootEmitter } = makeTestCommonOpts({ controller });

    createServiceSetup({
      commonOpts,
      rootEmitter,
      commands: [],
      commandHandlers: [],
      themeManager,
      shortcutTarget: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      platformServices: {
        errorService: TestErrorHandlerService,
        database: MemoryDatabaseService,
        syncDatabase: MemorySyncDatabaseService,
        // @ts-expect-error FileStorageMemory requires a config; it must be
        // registered via slot() so the config cannot silently go missing.
        fileStorageMemory: FileStorageMemory,
        router: MemoryRouterService,
      },
      fileStorageSlots: [],
      editorEngineId: 'prosemirror',
      editorSaveCoordinator: createEditorSaveCoordinator(),
    });

    controller.abort();
  });

  test('instantiates, mounts, and reports a healthy service graph', async () => {
    const { setup, controller } = makeSetup();

    const services = setup.instantiate();
    const coreServices = setup.coreServices();

    // The core aggregate exposes exactly the canonical core slots.
    expect(Object.keys(coreServices).sort()).toEqual(
      [...coreServiceSlotIds].sort(),
    );

    await setup.mountAll();

    const description = setup.describe();
    expect(description.failedSlot).toBeUndefined();
    expect(description.mountedCount).toBe(description.services.length);
    expect(description.services.length).toBe(coreServiceSlotIds.length + 5);

    // File storage slots are keyed by their workspace type for FileSystemService.
    expect(services.fileStorageMemory.mounted).toBe(true);

    controller.abort();
  });

  test('two file storage slots claiming one workspace type fail loudly', () => {
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
        fileStorageMemory: slot(FileStorageMemory, () => ({
          onChange: () => {},
        })),
        fileStorageMemoryDuplicate: slot(FileStorageMemory, () => ({
          onChange: () => {},
        })),
        router: MemoryRouterService,
      },
      fileStorageSlots: ['fileStorageMemory', 'fileStorageMemoryDuplicate'],
      editorEngineId: 'prosemirror',
      editorSaveCoordinator: createEditorSaveCoordinator(),
    });

    expect(() => setup.instantiate()).toThrow(
      /"fileStorageMemory" and "fileStorageMemoryDuplicate" both claim workspace type/,
    );

    controller.abort();
  });

  test('startup failure surfaces the slot id and phase', async () => {
    const { setup, controller } = makeSetup({
      fileStorageConfig: () => {
        throw new Error('boom');
      },
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

  test('core config overrides decorate the canonical config', async () => {
    const controller = new AbortController();
    const { commonOpts, rootEmitter } = makeTestCommonOpts({ controller });

    const [excludedCommand] = getEnabledCommands();
    if (!excludedCommand) {
      throw new Error('Expected at least one enabled command.');
    }

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
        fileStorageMemory: slot(FileStorageMemory, () => ({
          onChange: () => {},
        })),
        router: MemoryRouterService,
      },
      fileStorageSlots: ['fileStorageMemory'],
      editorEngineId: 'prosemirror',
      editorSaveCoordinator: createEditorSaveCoordinator(),
      coreConfigOverrides: {
        commandRegistry: (base) => ({
          ...base,
          commands: base.commands.filter(
            (command) => command.id !== excludedCommand.id,
          ),
        }),
      },
    });

    const services = setup.instantiate();

    expect(() =>
      services.commandRegistry.getCommand(excludedCommand.id),
    ).toThrow(/not found/);

    controller.abort();
  });
});
