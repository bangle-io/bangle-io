import { BaseError, BaseService } from '@bangle.io/base-utils';
import type {
  BaseServiceCommonOptions,
  Command,
  CommandHandler,
  CommandKey,
} from '@bangle.io/types';

type CommandHandlerConfig = { id: string; handler: CommandHandler };

export class CommandRegistryService extends BaseService<{
  commands: Command[];
  commandHandlers: CommandHandlerConfig[];
}> {
  private commands: Map<string, Command> = new Map();
  private handlers: Map<string, CommandHandler> = new Map();
  private commandKeyMap: WeakMap<Command, CommandKey<string>> = new WeakMap();

  public getCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  getCommandKey(command: Command): CommandKey<string> {
    const key = this.commandKeyMap.get(command);

    if (!key) {
      throw new BaseError({
        message: `Command "${command.id}" does not have a key.`,
      });
    }

    return key;
  }

  constructor(baseOptions: BaseServiceCommonOptions, dependencies: undefined) {
    super({
      ...baseOptions,
      name: 'command-registry',
      kind: 'core',
      dependencies,
      needsConfig: true,
    });
  }

  protected async onInitialize(): Promise<void> {}

  protected async onDispose(): Promise<void> {
    this.commands.clear();
    this.handlers.clear();
  }

  protected hookPostConfigSet(): void {
    for (const command of this.config.commands) {
      this.register(command);
    }

    for (const obj of this.config.commandHandlers) {
      this.registerHandler(obj);
    }

    this.logger.info(
      `Command registry initialized ${Object.keys(this.config.commands).length} commands & ${Object.keys(this.config.commandHandlers).length} handlers.`,
    );
  }

  register(command: Command) {
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

  registerHandler({ id, handler }: CommandHandlerConfig) {
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

  findHandler(id: string) {
    const handler = this.handlers.get(id);
    return handler;
  }

  getCommand(id: string): Command {
    const command = this.commands.get(id);
    if (!command) {
      throw new BaseError({
        message: `Command "${id}" not found.`,
      });
    }
    return command;
  }

  getOmniSearchCommands(): Command[] {
    return this.getCommands().filter((cmd) => cmd.omniSearch);
  }
}
