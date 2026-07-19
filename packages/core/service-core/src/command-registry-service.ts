import {
  BaseError,
  BaseService,
  type BaseServiceContext,
} from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';
import type {
  Command,
  CommandHandler,
  OmniSearchScope,
} from '@bangle.io/types';

export type CommandHandlerConfig = { id: string; handler: CommandHandler };

/**
 * Registers commands and their handlers for the app
 */
export class CommandRegistryService extends BaseService {
  static deps = [] as const;

  private commands: Map<string, Command> = new Map();
  private handlers: Map<string, CommandHandler> = new Map();

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

  public register(command: Command) {
    if (this.commands.has(command.id)) {
      throw new BaseError({
        message: `Command "${command.id}" is already registered.`,
      });
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

  public getOmniSearchCommands(activeScope: OmniSearchScope): Command[] {
    return this.getCommands().filter((command) => {
      switch (command.omniSearch) {
        case 'global':
          return true;
        case 'workspace':
          return activeScope !== 'global';
        case 'note':
          return activeScope === 'note';
        default:
          return false;
      }
    });
  }
}
