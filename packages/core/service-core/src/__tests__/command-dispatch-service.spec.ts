import {
  BaseError,
  BaseService,
  type BaseServiceContext,
  createAppError,
} from '@bangle.io/base-utils';
import { bangleAppCommands } from '@bangle.io/commands';
import { commandKeyToContext } from '@bangle.io/constants';
import { T } from '@bangle.io/mini-js-utils';
import { makeTestCommonOpts } from '@bangle.io/test-utils';
import type {
  Command,
  CommandDispatchResult,
  CommandHandler,
  CommandHandlerContext,
  CommandKey,
} from '@bangle.io/types';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { CommandDispatchService } from '../command-dispatch-service';
import { CommandRegistryService } from '../command-registry-service';

class TestService extends BaseService {
  constructor(context: BaseServiceContext, _dependencies: null) {
    super('file-system-test', context, null);
  }

  hookMount() {
    // noop
  }
}

function getCtx(key: CommandKey<string>) {
  const result = commandKeyToContext.get(key);
  if (!result) {
    throw new BaseError({
      message: `Command "${key.key}" is not registered.`,
    });
  }
  return {
    dispatch: result.context.dispatch,
    execute: result.context.execute,
    store: result.context.store,
  } satisfies CommandHandlerContext;
}

function executeRegisteredCommand(
  dispatchService: CommandDispatchService,
  id: string,
  args: unknown,
  from = 'testSource',
) {
  return dispatchService.execute(
    // @ts-expect-error exercises runtime validation against test commands.
    id,
    args,
    from,
  );
}

function createDeferred() {
  let resolve: (() => void) | undefined;
  const promise = new Promise<void>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return {
    promise,
    resolve: () => resolve?.(),
  };
}

async function setup() {
  const { commonOpts, mockLog, controller } = makeTestCommonOpts();
  const logger = commonOpts.logger;
  const context = {
    ctx: commonOpts,
    serviceContext: {
      abortSignal: commonOpts.rootAbortSignal,
    },
  };
  const commandRegistry = new CommandRegistryService(context, null, {
    commands: [],
    commandHandlers: [],
  });

  const dispatchedCommands: CommandDispatchResult[] = [];
  const focusEditor = vi.fn();
  const exposedServices = {
    fileSystem: new TestService(context, null),
  };

  const dispatchService = new CommandDispatchService(
    context,
    {
      commandRegistry,
    },
    {
      emitResult: (result) => {
        dispatchedCommands.push(result);
      },
      focusEditor,
      getExposedServices: () => exposedServices,
    },
  );

  await dispatchService.mount();
  return {
    commonOpts,
    logger,
    commandRegistry,
    dispatchService,
    focusEditor,
    mockLog: mockLog,
    dispatchedCommands,
    controller,
  };
}

describe('CommandDispatchService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should fail mount when exposed services are not wired', async () => {
    const { commonOpts } = makeTestCommonOpts();
    const context = {
      ctx: commonOpts,
      serviceContext: {
        abortSignal: commonOpts.rootAbortSignal,
      },
    };
    const commandRegistry = new CommandRegistryService(context, null, {
      commands: [],
      commandHandlers: [],
    });

    const dispatchService = new CommandDispatchService(
      context,
      {
        commandRegistry,
      },
      {
        emitResult: () => {},
        focusEditor: () => {},
        // @ts-expect-error verifies the startup guard for invalid DI wiring.
        getExposedServices: () => undefined,
      },
    );

    await expect(dispatchService.mount()).rejects.toThrow(
      /Assertion Failed: argument is undefined or null. exposedServices/,
    );
    expect(dispatchService.mounted).toBe(false);
  });

  test('should dispatch an omni-search command and focus the editor by default', async () => {
    const {
      mockLog,
      commandRegistry,
      dispatchService,
      dispatchedCommands,
      focusEditor,
    } = await setup();
    const command = {
      id: 'command::ui:toggle-sidebar',
      keywords: ['test', 'command'],
      dependencies: { services: ['fileSystem'] },
      omniSearch: 'global',
      args: null,
    } as const satisfies Command;

    const handler = vi.fn();

    commandRegistry.register(command);
    commandRegistry.registerHandler({
      id: 'command::ui:toggle-sidebar',
      handler,
    });

    dispatchService.dispatch('command::ui:toggle-sidebar', null, 'testSource');

    expect(handler).toHaveBeenCalledWith(
      {
        fileSystem: expect.any(TestService),
      },
      null,
      {
        key: expect.any(String),
      },
    );

    expect(dispatchedCommands).toContainEqual({
      type: 'success',
      command,
      from: 'testSource',
    });
    expect(focusEditor).toHaveBeenCalledOnce();

    () => {
      // type checks
      dispatchService.dispatch(
        'command::ui:toggle-sidebar',
        // @ts-expect-error arg should be null, since no arg is specified in the command
        {},
        'testSource',
      );
    };

    expect(mockLog.debug).toHaveBeenCalledWith(
      '[command-dispatch]',
      'Dispatching command::ui:toggle-sidebar from testSource:',
      null,
    );
  });

  test('should dispatch a command with args successfully', async () => {
    const { mockLog, commandRegistry, dispatchService } = await setup();
    const command = bangleAppCommands.find(
      (candidate) => candidate.id === 'command::ui:copy-workspace-path',
    );
    if (!command) {
      throw new Error('Expected copy-workspace-path command');
    }

    const handler = vi.fn();

    commandRegistry.register(command);
    commandRegistry.registerHandler({
      id: 'command::ui:copy-workspace-path',
      handler,
    });

    dispatchService.dispatch(
      'command::ui:copy-workspace-path',
      {
        wsPath: 'test-ws:note.md',
      },
      'testSource',
    );

    expect(handler).toHaveBeenCalledWith(
      {},
      {
        wsPath: 'test-ws:note.md',
      },
      {
        key: expect.any(String),
      },
    );

    expect(mockLog.debug).toBeCalledWith(
      '[command-dispatch]',
      'Dispatching command::ui:copy-workspace-path from testSource:',
      {
        wsPath: 'test-ws:note.md',
      },
    );

    () => {
      // type checks
      dispatchService.dispatch(
        'command::ui:copy-workspace-path',
        // @ts-expect-error missing required arg
        null,
        'testSource',
      );

      dispatchService.dispatch(
        'command::ui:copy-workspace-path',
        // @ts-expect-error empty arg
        {},
        'testSource',
      );

      dispatchService.dispatch(
        'command::ui:copy-workspace-path',
        // @ts-expect-error incorrect arg type
        { wsPath: 3 },
        'testSource',
      );

      dispatchService.dispatch(
        'command::ui:copy-workspace-path',
        {
          wsPath: 'test-ws:note.md',
          // @ts-expect-error extra arg that is not specified in the command
          extra: 'extra',
        },
        'testSource',
      );
    };
  });

  test('should convert async app error rejections into command failures and emitted app errors', async () => {
    const { commonOpts, commandRegistry, dispatchService, dispatchedCommands } =
      await setup();
    const command = {
      id: 'command::ui:toggle-sidebar',
      dependencies: { services: [] },
      args: null,
    } as const satisfies Command;
    const error = createAppError(
      'error::workspace:no-note-opened',
      'No note is currently open.',
      {},
    );

    commandRegistry.register(command);
    commandRegistry.registerHandler({
      id: command.id,
      handler: async () => {
        throw error;
      },
    });

    dispatchService.dispatch(command.id, null, 'testSource');

    await vi.waitFor(() => {
      expect(dispatchedCommands).toContainEqual({
        type: 'failure',
        command,
        from: 'testSource',
      });
      expect(commonOpts.emitAppError).toHaveBeenCalledWith(error);
    });
  });

  test('should throw error when dispatching a non-existent command', async () => {
    const { dispatchService } = await setup();
    expect(() =>
      // @ts-expect-error non-existent command
      dispatchService.dispatch('nonExistentCommand', null, 'testSource'),
    ).toThrow(/Command "nonExistentCommand" not found/);
  });

  test('should report a missing handler as a command failure', async () => {
    const { mockLog, commandRegistry, dispatchService, dispatchedCommands } =
      await setup();
    const command = {
      id: 'command::ui:toggle-sidebar',
      keywords: ['test', 'command'],
      dependencies: { services: ['fileSystem'] },
      omniSearch: 'global',
      args: null,
    } as const satisfies Command;

    commandRegistry.register(command);
    const result = await dispatchService.execute(
      command.id,
      null,
      'testSource',
    );

    expect(mockLog.warn).toHaveBeenCalledWith(
      '[command-dispatch]',
      'Handler for command "command::ui:toggle-sidebar" not found.',
    );
    expect(result).toMatchObject({
      type: 'failure',
      command,
      commandId: command.id,
      from: 'testSource',
    });
    if (result.type === 'failure') {
      expect(result.error).toHaveProperty(
        'message',
        'Handler for command "command::ui:toggle-sidebar" not found.',
      );
    }
    expect(dispatchedCommands).toEqual([
      {
        type: 'failure',
        command,
        from: 'testSource',
      },
    ]);
  });

  test('should not include services not specified in command.services', async () => {
    const { commandRegistry, dispatchService } = await setup();
    const command = {
      id: 'command::ui:toggle-sidebar',
      keywords: ['test', 'command'],
      dependencies: { services: [] },
      omniSearch: 'global',
      args: null,
    } as const satisfies Command;
    const handler = vi.fn();

    commandRegistry.register(command);
    commandRegistry.registerHandler({
      id: 'command::ui:toggle-sidebar',
      handler,
    });

    dispatchService.dispatch('command::ui:toggle-sidebar', null, 'testSource');

    // Handler receives only the services declared by the command and the
    // command's exact null input.
    expect(handler).toHaveBeenCalledWith({}, null, {
      key: expect.any(String),
    });
  });

  test('should throw error when dispatch service is not ready', async () => {
    const { dispatchService, controller } = await setup();
    controller.abort();

    expect(() =>
      dispatchService.dispatch(
        'command::ui:toggle-sidebar',
        null,
        'testSource',
      ),
    ).toThrow(/Dispatch service is not ready/);
  });

  test('should throw error for services that donot exist', async () => {
    const { commandRegistry, dispatchService } = await setup();
    const command: Command = {
      id: 'command::ui:toggle-sidebar',
      keywords: ['test', 'command'],
      dependencies: { services: ['unknown-service'] as any[] },
      omniSearch: 'global',
      args: null,
    } as const satisfies Command;
    const handler = vi.fn();

    commandRegistry.register(command);
    commandRegistry.registerHandler({
      id: 'command::ui:toggle-sidebar',
      handler,
    });

    expect(() =>
      dispatchService.dispatch(
        'command::ui:toggle-sidebar',
        null,
        'testSource',
      ),
    ).toThrow(
      /When dispatching command::ui:toggle-sidebar service:"unknown-service" not found./,
    );
  });

  test('should throw error for services for banned service', async () => {
    const { commandRegistry, dispatchService } = await setup();
    const command: Command = {
      id: 'command::ui:toggle-sidebar',
      keywords: ['test', 'command'],
      dependencies: { services: ['commandRegistry'] as any[] },
      omniSearch: 'global',
      args: null,
    } as const satisfies Command;
    const handler = vi.fn();

    commandRegistry.register(command);
    commandRegistry.registerHandler({
      id: 'command::ui:toggle-sidebar',
      handler,
    });

    expect(() =>
      dispatchService.dispatch(
        'command::ui:toggle-sidebar',
        null,
        'testSource',
      ),
    ).toThrow(
      /Command "command::ui:toggle-sidebar" uses an excluded service "commandRegistry"./,
    );
  });

  test('should allow a command to dispatch another command using the', async () => {
    const { commandRegistry, dispatchService } = await setup();

    const parentCommand = {
      id: 'command::parent',
      dependencies: {
        commands: ['command::child'],
      },
      args: null,
    } as const satisfies Command;

    const childCommand = {
      id: 'command::child',
      dependencies: {},
      args: null,
    } as const satisfies Command;

    const childHandler = vi.fn<CommandHandler>();
    const parentHandler = vi.fn<CommandHandler>((_services, _args, key) => {
      const { dispatch } = getCtx(key);
      dispatch('command::child', null);
    });

    commandRegistry.register(parentCommand);
    commandRegistry.registerHandler({
      id: 'command::parent',
      handler: parentHandler,
    });

    commandRegistry.register(childCommand);
    commandRegistry.registerHandler({
      id: 'command::child',
      handler: childHandler,
    });

    dispatchService.dispatch(
      // @ts-expect-error custom command
      'command::parent',
      null,
      'testSource',
    );

    expect(parentHandler).toHaveBeenCalled();
    expect(childHandler).toHaveBeenCalled();
  });

  test('should prevent cyclic command dispatch using getCtx', async () => {
    const { commandRegistry, dispatchService } = await setup();

    const command = {
      id: 'command::cyclic',
      dependencies: {
        commands: ['command::cyclic'],
      },
      args: null,
    } as const satisfies Command;

    const handler = vi.fn<CommandHandler>((_services, _args, key) => {
      const { dispatch } = getCtx(key);
      dispatch('command::cyclic', null);
    });

    commandRegistry.register(command);
    commandRegistry.registerHandler({
      id: 'command::cyclic',
      handler,
    });

    expect(() => {
      dispatchService.dispatch(
        // @ts-expect-error custom command
        'command::cyclic',
        null,
        'testSource',
      );
    }).toThrowError(`Command "command::cyclic" is trying to dispatch itself.`);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('should detect cyclic dependency in a deeper dispatch chain', async () => {
    const { commandRegistry, dispatchService } = await setup();

    const commandA = {
      id: 'command::A',
      dependencies: {
        commands: ['command::B'],
      },
      args: null,
    } as const satisfies Command;

    const commandB = {
      id: 'command::B',
      dependencies: {
        commands: ['command::C'],
      },
      args: null,
    } as const satisfies Command;

    const commandC = {
      id: 'command::C',
      dependencies: {
        commands: ['command::D'],
      },
      args: null,
    } as const satisfies Command;

    const commandD = {
      id: 'command::D',
      dependencies: {
        commands: ['command::B'],
      },
      args: null,
    } as const satisfies Command;

    const handlerA = vi.fn<CommandHandler>((_services, _args, key) => {
      const { dispatch } = getCtx(key);
      dispatch('command::B', null);
    });

    const handlerB = vi.fn<CommandHandler>((_services, _args, key) => {
      const { dispatch } = getCtx(key);
      dispatch('command::C', null);
    });

    const handlerC = vi.fn<CommandHandler>((_services, _args, key) => {
      const { dispatch } = getCtx(key);
      dispatch('command::D', null);
    });

    const handlerD = vi.fn<CommandHandler>((_services, _args, key) => {
      const { dispatch } = getCtx(key);
      dispatch('command::B', null); // This will cause cyclic dependency
    });

    commandRegistry.register(commandA);
    commandRegistry.registerHandler({
      id: 'command::A',
      handler: handlerA,
    });

    commandRegistry.register(commandB);
    commandRegistry.registerHandler({
      id: 'command::B',
      handler: handlerB,
    });

    commandRegistry.register(commandC);
    commandRegistry.registerHandler({
      id: 'command::C',
      handler: handlerC,
    });

    commandRegistry.register(commandD);
    commandRegistry.registerHandler({
      id: 'command::D',
      handler: handlerD,
    });

    expect(() => {
      dispatchService.dispatch(
        // @ts-expect-error custom command
        'command::A',
        null,
        'testSource',
      );
    }).toThrowError('Command "command::B" dispatch has cyclic dependency.');

    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).toHaveBeenCalledTimes(1);
    expect(handlerC).toHaveBeenCalledTimes(1);
    expect(handlerD).toHaveBeenCalledTimes(1);
  });

  // Add test for command failure
  test('should handle command failure correctly', async () => {
    const { commandRegistry, dispatchService, dispatchedCommands } =
      await setup();
    const failingCommand = {
      id: 'command::fail',
      dependencies: { services: ['fileSystem'] },
      args: null,
    } as const satisfies Command;

    const failingHandler = vi.fn().mockImplementation(() => {
      throw new BaseError({ message: 'Command failed' });
    });

    commandRegistry.register(failingCommand);
    commandRegistry.registerHandler({
      id: 'command::fail',
      handler: failingHandler,
    });

    expect(() =>
      dispatchService.dispatch(
        // @ts-expect-error custom command
        'command::fail',
        null,
        'testSource',
      ),
    ).toThrow(/Command failed/);

    expect(dispatchedCommands).toContainEqual({
      type: 'failure',
      command: failingCommand,
      from: 'testSource',
    });
  });

  // Add test for asynchronous command dispatch
  test('should handle async commands correctly', async () => {
    const { commandRegistry, dispatchService, dispatchedCommands } =
      await setup();
    const asyncCommand = {
      id: 'command::async',
      dependencies: { services: ['fileSystem'] },
      args: null,
    } as const satisfies Command;

    const asyncHandler = vi.fn().mockResolvedValue('Async Success');

    commandRegistry.register(asyncCommand);
    commandRegistry.registerHandler({
      id: 'command::async',
      handler: asyncHandler,
    });

    dispatchService.dispatch(
      // @ts-expect-error custom command
      'command::async',
      null,
      'testSource',
    );

    expect(dispatchedCommands).toHaveLength(0);

    // Wait for the async handler to resolve
    await Promise.resolve();

    expect(asyncHandler).toHaveBeenCalledWith(
      {
        fileSystem: expect.any(TestService),
      },
      null,
      {
        key: expect.any(String),
      },
    );

    expect(dispatchedCommands).toContainEqual({
      type: 'success',
      command: asyncCommand,
      from: 'testSource',
    });
  });

  test('validates null, records, required and optional fields, arrays, and unknown fields before invoking a handler', async () => {
    const { commandRegistry, dispatchService } = await setup();
    const command = {
      id: 'command::validation',
      dependencies: { services: [] },
      args: {
        title: T.String,
        tags: T.Array(T.String),
        page: T.Optional(T.Number),
      },
    } as const satisfies Command;
    const handler = vi.fn();
    commandRegistry.register(command);
    commandRegistry.registerHandler({ id: command.id, handler });

    const invalidOutcomes = await Promise.all([
      executeRegisteredCommand(dispatchService, command.id, null),
      executeRegisteredCommand(dispatchService, command.id, []),
      executeRegisteredCommand(dispatchService, command.id, {
        title: 'A note',
      }),
      executeRegisteredCommand(dispatchService, command.id, {
        title: 'A note',
        tags: ['one', 2],
      }),
      executeRegisteredCommand(dispatchService, command.id, {
        title: 'A note',
        tags: [],
        ignored: true,
      }),
    ]);
    for (const outcome of invalidOutcomes) {
      expect(outcome.type).toBe('failure');
    }
    expect(invalidOutcomes[0]).toHaveProperty(
      'error.message',
      'Command "command::validation" requires an argument record.',
    );
    expect(invalidOutcomes[1]).toHaveProperty(
      'error.message',
      'Command "command::validation" requires an argument record.',
    );
    expect(invalidOutcomes[2]).toHaveProperty(
      'error.message',
      expect.stringContaining('tags'),
    );
    expect(invalidOutcomes[3]).toHaveProperty(
      'error.message',
      expect.stringContaining('tags'),
    );
    expect(invalidOutcomes[4]).toHaveProperty(
      'error.message',
      expect.stringContaining('unknown argument'),
    );

    await expect(
      executeRegisteredCommand(dispatchService, command.id, {
        title: 'A note',
        tags: ['one'],
        page: undefined,
      }),
    ).resolves.toMatchObject({ type: 'success' });
    expect(handler).toHaveBeenCalledOnce();

    const nullCommand = {
      id: 'command::null-validation',
      dependencies: { services: [] },
      args: null,
    } as const satisfies Command;
    commandRegistry.register(nullCommand);
    commandRegistry.registerHandler({ id: nullCommand.id, handler });

    const nullOutcome = await executeRegisteredCommand(
      dispatchService,
      nullCommand.id,
      {},
    );
    expect(nullOutcome).toHaveProperty('type', 'failure');
    expect(nullOutcome).toHaveProperty(
      'error.message',
      expect.stringContaining('requires null'),
    );
    expect(handler).toHaveBeenCalledOnce();
  });

  test('settles async failures without an unhandled rejection and focuses only after settlement', async () => {
    const {
      commandRegistry,
      dispatchService,
      dispatchedCommands,
      focusEditor,
    } = await setup();
    const deferred = createDeferred();
    const command = {
      id: 'command::async-focus',
      dependencies: { services: [] },
      omniSearch: 'global',
      args: null,
    } as const satisfies Command;
    commandRegistry.register(command);
    commandRegistry.registerHandler({
      id: command.id,
      handler: async () => {
        await deferred.promise;
      },
    });

    const execution = executeRegisteredCommand(
      dispatchService,
      command.id,
      null,
    );
    expect(focusEditor).not.toHaveBeenCalled();
    expect(dispatchedCommands).toEqual([]);

    deferred.resolve();
    await expect(execution).resolves.toMatchObject({ type: 'success' });
    expect(focusEditor).toHaveBeenCalledOnce();

    const rejectedCommand = {
      id: 'command::async-rejection',
      dependencies: { services: [] },
      args: null,
    } as const satisfies Command;
    const error = new Error('async failure');
    commandRegistry.register(rejectedCommand);
    commandRegistry.registerHandler({
      id: rejectedCommand.id,
      handler: async () => {
        throw error;
      },
    });

    dispatchService.dispatch(
      // @ts-expect-error exercises a registered test command.
      rejectedCommand.id,
      null,
      'testSource',
    );
    await vi.waitFor(() => {
      expect(dispatchedCommands).toContainEqual({
        type: 'failure',
        command: rejectedCommand,
        from: 'testSource',
      });
    });
  });

  test('awaits child success and propagates a child AppError once through the parent failure', async () => {
    const { commonOpts, commandRegistry, dispatchService, dispatchedCommands } =
      await setup();
    const parent = {
      id: 'command::parent-execute',
      dependencies: { commands: ['command::child-execute'] },
      args: null,
    } as const satisfies Command;
    const child = {
      id: 'command::child-execute',
      dependencies: { services: [] },
      args: null,
    } as const satisfies Command;
    commandRegistry.register(parent);
    commandRegistry.register(child);
    commandRegistry.registerHandler({
      id: parent.id,
      handler: async (_services, _args, key) => {
        const outcome = await getCtx(key).execute(child.id, null);
        if (outcome.type === 'failure') {
          throw outcome.error;
        }
      },
    });
    commandRegistry.registerHandler({ id: child.id, handler: vi.fn() });

    await expect(
      executeRegisteredCommand(dispatchService, parent.id, null),
    ).resolves.toMatchObject({ type: 'success' });
    expect(dispatchedCommands).toEqual([
      { type: 'success', command: child, from: parent.id },
      { type: 'success', command: parent, from: 'testSource' },
    ]);

    const failingParent = {
      id: 'command::failing-parent-execute',
      dependencies: { commands: ['command::failing-child-execute'] },
      args: null,
    } as const satisfies Command;
    const failingChild = {
      id: 'command::failing-child-execute',
      dependencies: { services: [] },
      args: null,
    } as const satisfies Command;
    const appError = createAppError(
      'error::workspace:no-note-opened',
      'No note is currently open.',
      {},
    );
    commandRegistry.register(failingParent);
    commandRegistry.register(failingChild);
    commandRegistry.registerHandler({
      id: failingParent.id,
      handler: async (_services, _args, key) => {
        const outcome = await getCtx(key).execute(failingChild.id, null);
        if (outcome.type === 'failure') {
          throw outcome.error;
        }
      },
    });
    commandRegistry.registerHandler({
      id: failingChild.id,
      handler: async () => {
        throw appError;
      },
    });

    await expect(
      executeRegisteredCommand(dispatchService, failingParent.id, null),
    ).resolves.toMatchObject({
      type: 'failure',
      command: failingParent,
      error: appError,
    });
    await vi.waitFor(() => {
      expect(commonOpts.emitAppError).toHaveBeenCalledTimes(1);
      expect(commonOpts.emitAppError).toHaveBeenCalledWith(appError);
    });
  });

  test('keeps async ancestry per execution for nested cycles and concurrent roots', async () => {
    const { commandRegistry, dispatchService } = await setup();
    const commandA = {
      id: 'command::async-A',
      dependencies: { commands: ['command::async-B'] },
      args: null,
    } as const satisfies Command;
    const commandB = {
      id: 'command::async-B',
      dependencies: { commands: ['command::async-C'] },
      args: null,
    } as const satisfies Command;
    const commandC = {
      id: 'command::async-C',
      dependencies: { commands: ['command::async-B'] },
      args: null,
    } as const satisfies Command;
    const runChild = async (key: CommandKey<string>, id: string) => {
      const outcome = await getCtx(key).execute(id, null);
      if (outcome.type === 'failure') {
        throw outcome.error;
      }
    };
    commandRegistry.register(commandA);
    commandRegistry.register(commandB);
    commandRegistry.register(commandC);
    commandRegistry.registerHandler({
      id: commandA.id,
      handler: async (_services, _args, key) => runChild(key, commandB.id),
    });
    commandRegistry.registerHandler({
      id: commandB.id,
      handler: async (_services, _args, key) => {
        await Promise.resolve();
        await runChild(key, commandC.id);
      },
    });
    commandRegistry.registerHandler({
      id: commandC.id,
      handler: async (_services, _args, key) => {
        await Promise.resolve();
        await runChild(key, commandB.id);
      },
    });

    const cycleOutcome = await executeRegisteredCommand(
      dispatchService,
      commandA.id,
      null,
    );
    expect(cycleOutcome).toHaveProperty('type', 'failure');
    expect(cycleOutcome).toHaveProperty(
      'error.message',
      expect.stringContaining('cyclic dependency'),
    );

    const concurrentParent = {
      id: 'command::concurrent-parent',
      dependencies: { commands: ['command::concurrent-child'] },
      args: null,
    } as const satisfies Command;
    const concurrentChild = {
      id: 'command::concurrent-child',
      dependencies: { services: [] },
      args: null,
    } as const satisfies Command;
    const childHandler = vi.fn();
    commandRegistry.register(concurrentParent);
    commandRegistry.register(concurrentChild);
    commandRegistry.registerHandler({
      id: concurrentParent.id,
      handler: async (_services, _args, key) => {
        await Promise.resolve();
        await runChild(key, concurrentChild.id);
      },
    });
    commandRegistry.registerHandler({
      id: concurrentChild.id,
      handler: childHandler,
    });

    const outcomes = await Promise.all([
      executeRegisteredCommand(dispatchService, concurrentParent.id, null),
      executeRegisteredCommand(dispatchService, concurrentParent.id, null),
    ]);
    expect(outcomes).toEqual([
      expect.objectContaining({ type: 'success' }),
      expect.objectContaining({ type: 'success' }),
    ]);
    expect(childHandler).toHaveBeenCalledTimes(2);
  });

  test('uses schema-declared defaults for dynamic shortcut and omni command launches', async () => {
    const { commandRegistry, dispatchService } = await setup();
    const nullInputCommand = {
      id: 'command::shortcut-default',
      dependencies: { services: [] },
      args: null,
    } as const satisfies Command;
    const optionalInputCommand = {
      id: 'command::omni-default',
      dependencies: { services: [] },
      args: { prefill: T.Optional(T.String) },
    } as const satisfies Command;
    const nullInputHandler = vi.fn();
    const optionalInputHandler = vi.fn();
    commandRegistry.register(nullInputCommand);
    commandRegistry.register(optionalInputCommand);
    commandRegistry.registerHandler({
      id: nullInputCommand.id,
      handler: nullInputHandler,
    });
    commandRegistry.registerHandler({
      id: optionalInputCommand.id,
      handler: optionalInputHandler,
    });

    dispatchService.dispatchDefault(nullInputCommand, 'keyboard(ctrl-x)');
    dispatchService.dispatchDefault(optionalInputCommand, 'omni-search');

    expect(nullInputHandler).toHaveBeenCalledWith({}, null, expect.anything());
    expect(optionalInputHandler).toHaveBeenCalledWith(
      {},
      { prefill: undefined },
      expect.anything(),
    );
  });
});
