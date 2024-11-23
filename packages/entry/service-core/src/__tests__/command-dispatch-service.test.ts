import { BaseService, type Logger } from '@bangle.io/base-utils';
import { T } from '@bangle.io/mini-zod';
import { makeTestLogger } from '@bangle.io/test-utils';
import type { Command, CommandExposedServices } from '@bangle.io/types';
import { CommandDispatchService } from '../command-dispatch-service';
import { CommandRegistryService } from '../command-registry-service';

class TestService extends BaseService {
  constructor(logger: Logger) {
    super('fileSystemTest', 'core', logger);
  }
}

async function setup() {
  const testLogger = makeTestLogger();
  const logger = testLogger.logger;
  const commandRegistry = new CommandRegistryService(logger);

  const dispatchService = new CommandDispatchService(logger, {
    commandRegistry,
  });

  commandRegistry.setInitConfig({ commands: [], commandHandlers: [] });

  dispatchService.setInitConfig({
    exposedServices: {
      fileSystem: new TestService(logger),
    } as CommandExposedServices,
  });
  await dispatchService.initialize();
  return {
    logger,
    commandRegistry,
    dispatchService,
    mockLog: testLogger.mockLog,
  };
}

describe('CommandDispatchService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should dispatch a command successfully', async () => {
    const { mockLog, commandRegistry, dispatchService } = await setup();
    const command = {
      id: 'command::ui:toggle-sidebar',
      keywords: ['test', 'command'],
      services: ['fileSystem'],
      omniSearch: true,
      args: null,
    } as const satisfies Command;

    const handler = jest.fn();

    commandRegistry.register(command);
    commandRegistry.registerHandler('command::ui:toggle-sidebar', handler);

    dispatchService.dispatch('command::ui:toggle-sidebar', null, 'testSource');

    expect(handler).toHaveBeenCalledWith(
      {
        fileSystem: expect.any(TestService),
      },
      null,
    );

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
      'Dispatching command from testSource:',
      { args: null, id: 'command::ui:toggle-sidebar' },
    );
  });

  test('should dispatch a command with args successfully', async () => {
    const { mockLog, commandRegistry, dispatchService } = await setup();
    const command = {
      id: 'command::ui:create-new-workspace',
      keywords: ['new', 'create', 'workspace'],
      services: ['fileSystem'],
      omniSearch: true,
      args: {
        workspaceType: T.String,
      },
    } as const satisfies Command;

    const handler = jest.fn();

    commandRegistry.register(command);
    commandRegistry.registerHandler(
      'command::ui:create-new-workspace',
      handler,
    );

    dispatchService.dispatch(
      'command::ui:create-new-workspace',
      {
        workspaceType: 'browser',
        wsName: 'test-ws',
      },
      'testSource',
    );

    expect(handler).toHaveBeenCalledWith(
      {
        fileSystem: expect.any(TestService),
      },
      {
        workspaceType: 'browser',
        wsName: 'test-ws',
      },
    );

    expect(mockLog.debug).nthCalledWith(
      10,
      '[command-dispatch]',
      'Dispatching command from testSource:',
      {
        args: {
          workspaceType: 'browser',
          wsName: 'test-ws',
        },
        id: 'command::ui:create-new-workspace',
      },
    );

    () => {
      // type checks
      dispatchService.dispatch(
        'command::ui:create-new-workspace',
        // @ts-expect-error missing required arg
        null,
        'testSource',
      );

      dispatchService.dispatch(
        'command::ui:create-new-workspace',
        // @ts-expect-error empty arg
        {},
        'testSource',
      );

      dispatchService.dispatch(
        'command::ui:create-new-workspace',
        // @ts-expect-error incorrect arg type
        { workspaceType: 3 },
        'testSource',
      );

      dispatchService.dispatch(
        'command::ui:create-new-workspace',
        {
          workspaceType: 'test-ws',
          // @ts-expect-error extra arg that is not specified in the command
          extra: 'extra',
        },
        'testSource',
      );
    };
  });

  test('should throw error when dispatching a non-existent command', async () => {
    const { dispatchService } = await setup();
    expect(() =>
      // @ts-expect-error non-existent command
      dispatchService.dispatch('nonExistentCommand', null, 'testSource'),
    ).toThrow(/Command "nonExistentCommand" not found/);
  });

  test('should warn when handler for command is not found', async () => {
    const { mockLog, commandRegistry, dispatchService } = await setup();
    const command = {
      id: 'command::ui:toggle-sidebar',
      keywords: ['test', 'command'],
      services: ['fileSystem'],
      omniSearch: true,
      args: null,
    } as const satisfies Command;

    commandRegistry.register(command);
    dispatchService.dispatch(command.id, null, 'testSource');

    expect(mockLog.warn).toHaveBeenCalledWith(
      '[command-dispatch]',
      'Handler for command "command::ui:toggle-sidebar" not found.',
    );
  });

  test('should not include services not specified in command.services', async () => {
    const { commandRegistry, dispatchService } = await setup();
    const command = {
      id: 'command::ui:toggle-sidebar',
      keywords: ['test', 'command'],
      services: [],
      omniSearch: true,
      args: null,
    } as const satisfies Command;
    const handler = jest.fn();

    commandRegistry.register(command);
    commandRegistry.registerHandler('command::ui:toggle-sidebar', handler);

    dispatchService.dispatch('command::ui:toggle-sidebar', null, 'testSource');

    // handler should be called with an empty object
    expect(handler).toHaveBeenCalledWith({}, null);
  });

  test('should throw error when dispatch service is not ready', async () => {
    const { dispatchService } = await setup();
    await dispatchService.dispose();

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
      services: ['unknown-service'] as any[],
      omniSearch: true,
      args: null,
    } as const satisfies Command;
    const handler = jest.fn();

    commandRegistry.register(command);
    commandRegistry.registerHandler('command::ui:toggle-sidebar', handler);

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
      services: ['commandRegistry'] as any[],
      omniSearch: true,
      args: null,
    } as const satisfies Command;
    const handler = jest.fn();

    commandRegistry.register(command);
    commandRegistry.registerHandler('command::ui:toggle-sidebar', handler);

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
});
