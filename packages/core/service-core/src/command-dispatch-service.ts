import { BaseError, BaseService } from '@bangle.io/base-utils';
import type { BangleAppCommand } from '@bangle.io/commands';
import { commandExcludedServices } from '@bangle.io/constants';
import type { InferType, Validator } from '@bangle.io/mini-zod';
import type {
  BaseServiceCommonOptions,
  Command,
  CommandExposedServices,
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

    const command = this.commandRegistry.getCommand(id);

    if (!command) {
      throw new BaseError({ message: `Command "${id}" not found.` });
    }

    const result: Record<string, any> = {};
    const services = this.config.exposedServices;

    this.logger.warn(id, command.services);
    for (const serviceName of command.services) {
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

    void handler?.(result, args, { store: this.store });
  }
}
