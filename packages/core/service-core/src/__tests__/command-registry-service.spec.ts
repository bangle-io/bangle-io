import { makeTestCommonOpts } from '@bangle.io/test-utils';
import type { Command } from '@bangle.io/types';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { CommandRegistryService } from '../command-registry-service';

async function setup() {
  const { commonOpts, controller } = makeTestCommonOpts();
  const logger = commonOpts.logger;
  const service = new CommandRegistryService(
    {
      serviceContext: {
        abortSignal: commonOpts.rootAbortSignal,
      },
      ctx: commonOpts,
    },
    null,
    {
      commands: [],
      commandHandlers: [],
    },
  );

  await service.mount();

  return {
    service,
    logger,
    controller,
  };
}

describe('CommandRegistryService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should register a command successfully', async () => {
    const { service } = await setup();
    const command = {
      id: 'testCommand',
      keywords: ['test', 'command'],
      dependencies: { services: [] },
      omniSearch: false,
      args: null,
    } as const satisfies Command;
    service.register(command);

    expect(
      service.getCommands().find((c) => c.id === 'testCommand'),
    ).toBeDefined();
  });

  test('should get a command by id', async () => {
    const { service } = await setup();
    const command = {
      id: 'testCommand',
      keywords: ['test', 'command'],
      dependencies: { services: [] },
      omniSearch: false,
      args: null,
    } as const satisfies Command;
    service.register(command);

    const retrievedCommand = service.getCommand('testCommand');
    expect(retrievedCommand).toEqual(command);
  });

  test('should throw error when registering a duplicate command', async () => {
    const { service } = await setup();
    const command = {
      id: 'duplicateCommand',
      keywords: ['duplicate'],
      dependencies: { services: [] },
      omniSearch: false,
      args: null,
    } as const satisfies Command;
    service.register(command);

    expect(() => service.register(command)).toThrow(
      /Command "duplicateCommand" is already registered/,
    );
  });

  test('should throw error when getting a non-existent command', async () => {
    const { service } = await setup();
    expect(() => service.getCommand('nonExistentCommand')).toThrow(
      /Command "nonExistentCommand" not found/,
    );
  });

  test('should register a handler successfully', async () => {
    const { service } = await setup();
    const handler = vi.fn();
    service.registerHandler({ id: 'testCommand', handler });

    const registeredHandler = service.findHandler('testCommand');
    expect(registeredHandler).toBe(handler);
  });

  test('should throw error when registering a duplicate handler', async () => {
    const { service } = await setup();
    const handler = vi.fn();
    service.registerHandler({ id: 'testCommand', handler });

    expect(() =>
      service.registerHandler({ id: 'testCommand', handler }),
    ).toThrow(/Handler for command "testCommand" is already registered/);
  });

  test('should return undefined when finding a handler that does not exist', async () => {
    const { service } = await setup();
    const handler = service.findHandler('nonExistentCommand');
    expect(handler).toBeUndefined();
  });

  test('onDispose should clear all commands and handlers', async () => {
    const { service, controller } = await setup();
    const command = {
      id: 'testCommand',
      keywords: ['duplicate'],
      dependencies: { services: [] },
      omniSearch: false,
      args: null,
    } as const satisfies Command;
    const handler = vi.fn();
    service.register(command);
    service.registerHandler({ id: 'testCommand', handler });
    controller.abort();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(service.getCommands().length).toBe(0);

    expect(service.findHandler('testCommand')).toBeUndefined();
  });
});
