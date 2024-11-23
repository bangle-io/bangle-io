import { BaseError, BaseService, type Logger } from '@bangle.io/base-utils';
import type { Command, CommandHandler } from '@bangle.io/types';

type CommandHandlerConfig = { id: string; handler: CommandHandler };

export class CommandRegistryService extends BaseService<{
  commands: Command[];
  commandHandlers: CommandHandlerConfig[];
}> {
  private commands: Map<string, Command> = new Map();
  private handlers: Map<string, CommandHandler> = new Map();

  public getCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  constructor(logger: Logger) {
    super('commandRegistry', 'core', logger, {}, { needsConfig: true });
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
}
