import { commandHandlers as defaultCommandHandlers } from '@bangle.io/command-handlers';
import { type BangleAppCommand, getEnabledCommands } from '@bangle.io/commands';
import {
  type CommandDispatchService,
  type CommandHandlerConfig,
  CommandRegistryService,
} from '@bangle.io/service-core';
import type {
  Command,
  CommandArgs,
  CommandExposedServices,
  CommandHandler,
  RootEvents,
} from '@bangle.io/types';
import { createTestEnvironment } from './test-service-setup';

type TestCommandHandlerArgs = {
  commands?: Command[];
  commandHandlers?: CommandHandlerConfig[];
  target: CommandHandlerConfig;
  testEnvArgs?: Parameters<typeof createTestEnvironment>[0];
};
type TestCommandResult = Extract<
  RootEvents,
  { event: 'event::command:result' }
>['payload'];

type TestEnvironment = ReturnType<typeof createTestEnvironment>;
export type TestCommandHandlerReturnType = {
  testEnv: TestEnvironment;
  dispatch: <TId extends BangleAppCommand['id']>(
    id: TId,
    args: CommandArgs<Extract<BangleAppCommand, { id: TId }>>,
  ) => void;
  autoMountServices: () => Promise<CommandExposedServices>;
  getCommandResults: () => Array<TestCommandResult>;
};

export function testCommandHandler({
  commands = getEnabledCommands(),
  commandHandlers = defaultCommandHandlers,
  target,
  testEnvArgs = {},
}: TestCommandHandlerArgs): TestCommandHandlerReturnType {
  const testEnv = createTestEnvironment(testEnvArgs);

  let commandDispatcher: CommandDispatchService | undefined = undefined;

  const commandResults: Array<TestCommandResult> = [];

  return {
    testEnv,
    getCommandResults: () => commandResults,
    dispatch: (id, args) => {
      if (!commandDispatcher) {
        throw new Error('Command dispatcher not mounted');
      }
      commandDispatcher.dispatch(id, args, 'test');
    },
    autoMountServices: async () => {
      testEnv.setDefaultConfig();
      const allCommandHandlers = commandHandlers.filter(
        (handler) => handler.id !== target.id,
      );
      allCommandHandlers.push(target);
      testEnv.getContainer().setConfig(CommandRegistryService, () => ({
        commands,
        commandHandlers: allCommandHandlers,
      }));
      const services = testEnv.instantiateAll();

      commandDispatcher = services.commandDispatcher;

      await testEnv.mountAll();

      testEnv.rootEmitter.on(
        'event::command:result',
        (event) => {
          commandResults.push(event);
        },
        testEnv.commonOpts.rootAbortSignal,
      );
      return services;
    },
  };
}
