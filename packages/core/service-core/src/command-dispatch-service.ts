import {
  assertIsDefined,
  BaseError,
  BaseService,
  type BaseServiceContext,
} from '@bangle.io/base-utils';
import type { BangleAppCommand } from '@bangle.io/commands';
import {
  commandExcludedServices,
  commandKeyToContext,
  SERVICE_NAME,
} from '@bangle.io/constants';
import type {
  Command,
  CommandArgs,
  CommandDispatchResult,
  CommandExposedServices,
  CommandHandlerContext,
  CommandKey,
} from '@bangle.io/types';
import type { CommandRegistryService } from './command-registry-service';

type CommandDispatchServiceConfig = {
  emitResult: (event: CommandDispatchResult) => void;
  /**
   * Focus the editor.
   * This is used to focus the editor when a command is dispatched.
   */
  focusEditor: () => void;
};
/**
 * Service responsible for dispatching commands to their handlers
 */
export class CommandDispatchService extends BaseService {
  static deps = ['commandRegistry'] as const;

  private fromChain: string[] = [];
  exposedServices!: CommandExposedServices;

  constructor(
    context: BaseServiceContext,
    private dep: { commandRegistry: CommandRegistryService },
    private config: CommandDispatchServiceConfig,
  ) {
    super(SERVICE_NAME.commandDispatchService, context, dep);
    this.addCleanup(() => {
      this.fromChain = [];
    });
  }

  hookMount() {
    assertIsDefined(this.exposedServices, 'exposedServices');
  }

  public dispatch<TId extends BangleAppCommand['id']>(
    id: TId,
    args: CommandArgs<Extract<BangleAppCommand, { id: TId }>>,
    from: string,
    options?: {
      /**
       * Focus the editor after the command is dispatched.
       */
      overrideAutoFocus?: boolean;
    },
  ): void {
    this.logger.debug(`Dispatching ${id} from ${from}:`, args);

    if (!this.mounted) {
      throw new BaseError({
        message: 'Dispatch service is not ready.',
      });
    }

    if (this.fromChain.includes(from) || this.fromChain.includes(id)) {
      this.logger.error('fromChain', this.fromChain);
      throw new BaseError({
        message: `Command "${id}" dispatch has cyclic dependency.`,
      });
    }

    const command = this.dep.commandRegistry.getCommand(id);

    if (!command) {
      throw new BaseError({ message: `Command "${id}" not found.` });
    }

    const result: Record<string, any> = {};
    const services = this.exposedServices;

    this.logger.debug(
      'dispatching',
      id,
      'services=',
      command.dependencies?.services,
    );

    for (const serviceName of command.dependencies?.services || []) {
      const service = services[serviceName];

      const excludedServices: string[] = commandExcludedServices;
      if (excludedServices.includes(serviceName)) {
        throw new BaseError({
          message: `Command "${id}" uses an excluded service "${serviceName}".`,
        });
      }
      if (service) {
        result[serviceName] = service;
      } else {
        throw new BaseError({
          message: `When dispatching ${id} service:"${serviceName}" not found.`,
        });
      }
    }

    const handler = this.dep.commandRegistry.findHandler(id);

    if (!handler) {
      this.logger.warn(`Handler for command "${id}" not found.`);
    }

    const key: CommandKey<string> = { key: id };
    this.setCommandContext(command, key);
    this.fromChain.push(from);
    try {
      const outcome = handler?.(result, args || {}, key);

      if (outcome instanceof Promise) {
        outcome.then(
          () => {
            this.onCommandResult({
              type: 'success',
              command,
              from,
            });
          },
          (error) => {
            this.onCommandResult({
              type: 'failure',
              command,
              from,
            });
            throw error;
          },
        );
      } else {
        this.onCommandResult({
          type: 'success',
          command,
          from,
        });
      }
    } catch (error) {
      this.onCommandResult({
        type: 'failure',
        command,
        from,
      });
      throw error;
    } finally {
      // even if the handler throws, we should remove the command from the chain
      this.fromChain.pop();
      const autoFocus =
        options?.overrideAutoFocus ??
        command.autoFocusEditor ??
        command.omniSearch;

      if (autoFocus === true) {
        this.config.focusEditor();
      }
    }
  }

  private onCommandResult(result: CommandDispatchResult): void {
    this.config.emitResult(result);
  }

  private setCommandContext(command: Command, key: CommandKey<string>): void {
    const context: CommandHandlerContext = {
      store: this.store,
      dispatch: (childId: string, args: any) => {
        if (childId === command.id) {
          throw new BaseError({
            message: `Command "${command.id}" is trying to dispatch itself.`,
          });
        }

        if (!command.dependencies?.commands?.includes(childId)) {
          throw new BaseError({
            message: `Command "${command.id}" is trying to dispatch "${childId}" which is not allowed.`,
          });
        }

        this.dispatch(childId as BangleAppCommand['id'], args, command.id);
      },
    };
    commandKeyToContext.set(key, { context });
  }
}
