import {
  BaseError,
  BaseService,
  type BaseServiceContext,
} from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';
import type { Command, CommandHandler, CommandKey } from '@bangle.io/types';

export type CommandHandlerConfig = { id: string; handler: CommandHandler };

/**
 * Registers commands and their handlers for the app
 */
export class CommandRegistryService extends BaseService {
  static deps = [] as const;

  private commands: Map<string, Command> = new Map();
  private handlers: Map<string, CommandHandler> = new Map();
  private commandKeyMap: WeakMap<Command, CommandKey<string>> = new WeakMap();

  constructor(
    context: BaseServiceContext,
    dependencies: null,
    private config: {
      commands: Command[];
      commandHandlers: CommandHandlerConfig[];
    },
  ) {
    super(SERVICE_NAME.commandRegistryService, context, dependencies);
  }

  hookMount() {
    for (const command of this.config.commands) {
      this.register(command);
    }

    for (const obj of this.config.commandHandlers) {
      this.registerHandler(obj);
    }

    this.logger.info(
      `Command registry initialized ${this.config.commands.length} commands & ${this.config.commandHandlers.length} handlers.`,
    );

    this.addCleanup(() => {
      this.commands.clear();
      this.handlers.clear();
    });
  }

  public getCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  public getCommandKey(command: Command): CommandKey<string> {
    const key = this.commandKeyMap.get(command);
    if (!key) {
      throw new BaseError({
        message: `Command "${command.id}" does not have a key.`,
      });
    }
    return key;
  }

  public register(command: Command) {
    if (this.commands.has(command.id)) {
      throw new BaseError({
        message: `Command "${command.id}" is already registered.`,
      });
    }

    if (!this.commandKeyMap.has(command)) {
      this.commandKeyMap.set(command, { key: command.id });
    }

    this.commands.set(command.id, command);
  }

  public registerHandler({ id, handler }: CommandHandlerConfig) {
    if (this.handlers.has(id)) {
      throw new BaseError({
        message: `Handler for command "${id}" is already registered.`,
      });
    }
    this.handlers.set(id, handler);

    return () => {
      this.handlers.delete(id);
    };
  }

  public findHandler(id: string) {
    const handler = this.handlers.get(id);
    return handler;
  }

  public getCommand(id: string): Command {
    const command = this.commands.get(id);
    if (!command) {
      throw new BaseError({
        message: `Command "${id}" not found.`,
      });
    }
    return command;
  }

  public getOmniSearchCommands(): Command[] {
    return this.getCommands().filter((cmd) => cmd.omniSearch);
  }
}
