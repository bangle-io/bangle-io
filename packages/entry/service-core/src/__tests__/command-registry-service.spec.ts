import type { Logger } from '@bangle.io/logger';
import { makeTestLogger } from '@bangle.io/test-utils';
import type { Command } from '@bangle.io/types';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { CommandRegistryService } from '../command-registry-service';

describe('CommandRegistryService', () => {
  let logger: Logger;
  let service: CommandRegistryService;

  beforeEach(() => {
    const testLogger = makeTestLogger();
    logger = testLogger.logger;
    service = new CommandRegistryService(logger);
    service.setInitConfig({ commands: [], commandHandlers: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should register a command successfully', () => {
    const command = {
      id: 'testCommand',
      keywords: ['test', 'command'],
      services: [],
      omniSearch: false,
      args: null,
    } as const satisfies Command;
    service.register(command);

    expect(
      service.getCommands().find((c) => c.id === 'testCommand'),
    ).toBeDefined();
  });

  test('should get a command by id', () => {
    const command = {
      id: 'testCommand',
      keywords: ['test', 'command'],
      services: [],
      omniSearch: false,
      args: null,
    } as const satisfies Command;
    service.register(command);

    const retrievedCommand = service.getCommand('testCommand');
    expect(retrievedCommand).toEqual(command);
  });

  test('should throw error when registering a duplicate command', () => {
    const command = {
      id: 'duplicateCommand',
      keywords: ['duplicate'],
      services: [],
      omniSearch: false,
      args: null,
    } as const satisfies Command;
    service.register(command);

    expect(() => service.register(command)).toThrow(
      /Command "duplicateCommand" is already registered/,
    );
  });

  test('should throw error when getting a non-existent command', () => {
    expect(() => service.getCommand('nonExistentCommand')).toThrow(
      /Command "nonExistentCommand" not found/,
    );
  });

  test('should register a handler successfully', () => {
    const handler = vi.fn();
    service.registerHandler({ id: 'testCommand', handler });

    const registeredHandler = service.findHandler('testCommand');
    expect(registeredHandler).toBe(handler);
  });

  test('should throw error when registering a duplicate handler', () => {
    const handler = vi.fn();
    service.registerHandler({ id: 'testCommand', handler });

    expect(() =>
      service.registerHandler({ id: 'testCommand', handler }),
    ).toThrow(/Handler for command "testCommand" is already registered/);
  });

  test('should return undefined when finding a handler that does not exist', () => {
    const handler = service.findHandler('nonExistentCommand');
    expect(handler).toBeUndefined();
  });

  test('onDispose should clear all commands and handlers', async () => {
    const command = {
      id: 'testCommand',
      keywords: ['duplicate'],
      services: [],
      omniSearch: false,
      args: null,
    } as const satisfies Command;
    const handler = vi.fn();
    service.register(command);
    service.registerHandler({ id: 'testCommand', handler });

    await service.dispose();
    expect(service.getCommands().length).toBe(0);
    expect(service.findHandler('testCommand')).toBeUndefined();
  });
});
