import { BaseError, BaseService } from '@bangle.io/base-utils';
import type { BangleAppCommand } from '@bangle.io/commands';
import {
  commandExcludedServices,
  commandKeyToContext,
} from '@bangle.io/constants';
import type { InferType, Validator } from '@bangle.io/mini-zod';
import type {
  BaseServiceCommonOptions,
  Command,
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

export class CommandDispatchService extends BaseService<{
  exposedServices: CommandExposedServices;
}> {
  private commandRegistry: CommandRegistryService;

  private fromChain: string[] = [];

  constructor(
    baseOptions: BaseServiceCommonOptions,
    dependencies: {
      commandRegistry: CommandRegistryService;
    },
  ) {
    super({
      ...baseOptions,
      name: 'command-dispatch',
      kind: 'core',
      dependencies,
      needsConfig: true,
    });
    this.commandRegistry = dependencies.commandRegistry;

    this.addCleanup(() => {
      this.fromChain = [];
    });
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

  dispatch<TId extends BangleAppCommand['id']>(
    id: TId,
    args: CommandArgs<Extract<BangleAppCommand, { id: TId }>>,
    from: string,
  ): void {
    this.logger.debug(`Dispatching ${id} from ${from}:`, args);

    if (!this.isOk) {
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

    const command = this.commandRegistry.getCommand(id);

    if (!command) {
      throw new BaseError({ message: `Command "${id}" not found.` });
    }

    const result: Record<string, any> = {};
    const services = this.config.exposedServices;

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

    const handler = this.commandRegistry.findHandler(id);

    if (!handler) {
      this.logger.warn(`Handler for command "${id}" not found.`);
    }

    const key: CommandKey<string> = { key: id };
    this.setCommandContext(command, key);
    this.fromChain.push(from);
    void handler?.(result, args, key);
    this.fromChain.pop();
  }
}
