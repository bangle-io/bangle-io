import {
  BaseError,
  BaseService2,
  type BaseServiceContext,
  assertIsDefined,
} from '@bangle.io/base-utils';
import type { BangleAppCommand } from '@bangle.io/commands';
import {
  SERVICE_NAME,
  commandExcludedServices,
  commandKeyToContext,
} from '@bangle.io/constants';
import type { InferType, Validator } from '@bangle.io/mini-zod';
import type {
  Command,
  CommandDispatchResult,
  CommandExposedServices,
  CommandHandlerContext,
  CommandKey,
} from '@bangle.io/types';
import type { CommandRegistryService } from './command-registry-service';

type CommandArgs<C extends Command> = C['args'] extends null
  ? null
  : {
      [K in keyof C['args']]: C['args'][K] extends Validator<any>
        ? InferType<C['args'][K]>
        : never;
    };

/**
 * Service responsible for dispatching commands to their handlers
 */
export class CommandDispatchService extends BaseService2 {
  static deps = ['commandRegistry'] as const;

  private fromChain: string[] = [];
  exposedServices!: CommandExposedServices;

  constructor(
    context: BaseServiceContext,
    private dep: { commandRegistry: CommandRegistryService },
    private config: {
      emitResult: (event: CommandDispatchResult) => void;
    },
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
