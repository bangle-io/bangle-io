import { BaseService } from '@bangle.io/base-utils';
import { T } from '@bangle.io/mini-zod';
import { makeTestLogger, makeTestService } from '@bangle.io/test-utils';
import type {
  BaseServiceCommonOptions,
  Command,
  CommandExposedServices,
} from '@bangle.io/types';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { CommandDispatchService } from '../command-dispatch-service';
import { CommandRegistryService } from '../command-registry-service';

class TestService extends BaseService {
  constructor(baseOptions: BaseServiceCommonOptions) {
    super({
      ...baseOptions,
      name: 'file-system-test',
      kind: 'core',
      dependencies: {},
    });
  }
}

async function setup() {
  const { commonOpts, mockLog } = makeTestService();
  const logger = commonOpts.logger;
  const commandRegistry = new CommandRegistryService(commonOpts);

  const dispatchService = new CommandDispatchService(commonOpts, {
    commandRegistry,
  });

  commandRegistry.setInitConfig({ commands: [], commandHandlers: [] });

  dispatchService.setInitConfig({
    exposedServices: {
      fileSystem: new TestService(commonOpts),
    } as CommandExposedServices,
  });
  await dispatchService.initialize();
  return {
    logger,
    commandRegistry,
    dispatchService,
    mockLog: mockLog,
  };
}

describe('CommandDispatchService', () => {
  afterEach(() => {
    vi.clearAllMocks();
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
      'Dispatching command::ui:toggle-sidebar from testSource:',
      null,
    );
  });

  test('should dispatch a command with args successfully', async () => {
    const { mockLog, commandRegistry, dispatchService } = await setup();
    const command = {
      id: 'command::ui:test-no-use',
      keywords: ['new', 'create', 'workspace'],
      services: ['fileSystem'],
      omniSearch: true,
      args: {
        workspaceType: T.String,
      },
    } as const satisfies Command;

    const handler = vi.fn();

    commandRegistry.register(command);
    commandRegistry.registerHandler({
      id: 'command::ui:test-no-use',
      handler,
    });

    dispatchService.dispatch(
      'command::ui:test-no-use',
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
      'Dispatching command::ui:test-no-use from testSource:',
      {
        workspaceType: 'browser',
        wsName: 'test-ws',
      },
    );

    () => {
      // type checks
      dispatchService.dispatch(
        'command::ui:test-no-use',
        // @ts-expect-error missing required arg
        null,
        'testSource',
      );

      dispatchService.dispatch(
        'command::ui:test-no-use',
        // @ts-expect-error empty arg
        {},
        'testSource',
      );

      dispatchService.dispatch(
        'command::ui:test-no-use',
        // @ts-expect-error incorrect arg type
        { workspaceType: 3 },
        'testSource',
      );

      dispatchService.dispatch(
        'command::ui:test-no-use',
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
    const handler = vi.fn();

    commandRegistry.register(command);
    commandRegistry.registerHandler({
      id: 'command::ui:toggle-sidebar',
      handler,
    });

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
      services: ['commandRegistry'] as any[],
      omniSearch: true,
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
});
