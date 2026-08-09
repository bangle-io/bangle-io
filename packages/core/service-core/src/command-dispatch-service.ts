import {
  assertIsDefined,
  BaseError,
  BaseService,
  type BaseServiceContext,
  isAppError,
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
  CommandExecutionResult,
  CommandExposedServiceSlotId,
  CommandHandlerContext,
  CommandKey,
} from '@bangle.io/types';
import type { CommandRegistryService } from './command-registry-service';

type CommandExposedServices = Partial<
  Record<CommandExposedServiceSlotId, BaseService>
>;

type CommandDispatchServiceConfig = {
  emitResult: (event: CommandDispatchResult) => void;
  getExposedServices: () => CommandExposedServices;
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

  private handledAppErrors = new WeakSet<object>();

  constructor(
    context: BaseServiceContext,
    private dep: { commandRegistry: CommandRegistryService },
    private config: CommandDispatchServiceConfig,
  ) {
    super(SERVICE_NAME.commandDispatchService, context, dep);
    this.addCleanup(() => {
      this.handledAppErrors = new WeakSet();
    });
  }

  hookMount() {
    assertIsDefined(this.config.getExposedServices(), 'exposedServices');
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
    const execution = this.beginExecution({
      id,
      args,
      from,
      options,
      ancestry: [],
      reportSynchronousAppError: false,
    });

    // `beginExecution` always contains asynchronous failures in its result.
    // Keeping this promise detached therefore cannot create an unhandled
    // rejection, while synchronous handler failures retain dispatch's legacy
    // throw behavior below.
    void execution.result;

    if (execution.synchronousError) {
      throw execution.synchronousError.error;
    }
  }

  /**
   * Execute a command and receive its settled success or failure outcome.
   * Handler and validation failures are represented in the result so callers
   * can await child commands without creating detached rejection paths.
   */
  public execute<TId extends BangleAppCommand['id']>(
    id: TId,
    args: CommandArgs<Extract<BangleAppCommand, { id: TId }>>,
    from: string,
    options?: {
      /** Focus the editor after the command settles. */
      overrideAutoFocus?: boolean;
    },
  ): Promise<CommandExecutionResult> {
    return this.beginExecution({
      id,
      args,
      from,
      options,
      ancestry: [],
      reportSynchronousAppError: true,
    }).result;
  }

  /**
   * Run a command with the input declared by its schema: `null` for
   * null-input commands and an empty record for commands with only optional
   * inputs. Dynamic entry points such as shortcuts and omni search use this
   * instead of forwarding event objects or inventing an input shape.
   */
  public dispatchDefault(
    command: Command,
    from: string,
    options?: {
      /** Focus the editor after the command settles. */
      overrideAutoFocus?: boolean;
    },
  ): void {
    const execution = this.beginExecution({
      id: command.id,
      args: this.getDefaultArgs(command),
      from,
      options,
      ancestry: [],
      reportSynchronousAppError: false,
    });
    void execution.result;

    if (execution.synchronousError) {
      throw execution.synchronousError.error;
    }
  }

  private onCommandResult(result: CommandDispatchResult): void {
    this.config.emitResult(result);
  }

  private beginExecution(params: {
    id: string;
    args: unknown;
    from: string;
    options?: { overrideAutoFocus?: boolean };
    ancestry: readonly string[];
    reportSynchronousAppError: boolean;
  }): {
    result: Promise<CommandExecutionResult>;
    synchronousError?: { error: unknown };
  } {
    const { id, args, from, options, ancestry, reportSynchronousAppError } =
      params;
    let command: Command | undefined;

    try {
      this.logger.debug(`Dispatching ${id} from ${from}:`, args);

      if (!this.mounted) {
        throw new BaseError({
          message: 'Dispatch service is not ready.',
        });
      }

      if (ancestry.includes(id)) {
        throw new BaseError({
          message: `Command "${id}" dispatch has cyclic dependency.`,
        });
      }

      const registeredCommand = this.dep.commandRegistry.getCommand(id);
      command = registeredCommand;
      this.assertValidArgs(registeredCommand, args);

      const handler = this.dep.commandRegistry.findHandler(id);
      if (!handler) {
        this.logger.warn(`Handler for command "${id}" not found.`);
        return {
          result: Promise.resolve(
            this.settleFailure(
              registeredCommand,
              id,
              from,
              options,
              new BaseError({
                message: `Handler for command "${id}" not found.`,
              }),
            ),
          ),
        };
      }

      const services = this.getRequiredServices(registeredCommand);
      const key: CommandKey<string> = { key: id };
      const state = { settled: false };
      this.setCommandContext(registeredCommand, key, ancestry, state);

      let handlerResult: void | Promise<void>;
      try {
        handlerResult = handler(services, args, key);
      } catch (error) {
        return {
          result: Promise.resolve(
            this.settleFailure(
              registeredCommand,
              id,
              from,
              options,
              error,
              state,
              reportSynchronousAppError,
            ),
          ),
          synchronousError: { error },
        };
      }

      if (!(handlerResult instanceof Promise)) {
        return {
          result: Promise.resolve(
            this.settleSuccess(registeredCommand, from, options, state),
          ),
        };
      }

      return {
        result: handlerResult.then(
          () => this.settleSuccess(registeredCommand, from, options, state),
          (error) =>
            this.settleFailure(
              registeredCommand,
              id,
              from,
              options,
              error,
              state,
              true,
            ),
        ),
      };
    } catch (error) {
      return {
        result: Promise.resolve(
          this.settleFailure(
            command,
            id,
            from,
            options,
            error,
            undefined,
            reportSynchronousAppError,
          ),
        ),
        synchronousError: { error },
      };
    }
  }

  private getRequiredServices(command: Command): Record<string, BaseService> {
    const result: Record<string, BaseService> = {};
    const services = this.config.getExposedServices();

    this.logger.debug(
      'dispatching',
      command.id,
      'services=',
      command.dependencies?.services,
    );

    for (const serviceName of command.dependencies?.services || []) {
      const service = services[serviceName];
      const excludedServices: string[] = commandExcludedServices;
      if (excludedServices.includes(serviceName)) {
        throw new BaseError({
          message: `Command "${command.id}" uses an excluded service "${serviceName}".`,
        });
      }
      if (!service) {
        throw new BaseError({
          message: `When dispatching ${command.id} service:"${serviceName}" not found.`,
        });
      }
      result[serviceName] = service;
    }

    return result;
  }

  private assertValidArgs(command: Command, args: unknown): void {
    if (command.args === null) {
      if (args !== null) {
        throw new BaseError({
          message: `Command "${command.id}" requires null arguments.`,
        });
      }
      return;
    }

    if (!isRecord(args)) {
      throw new BaseError({
        message: `Command "${command.id}" requires an argument record.`,
      });
    }

    const expectedKeys = new Set(Object.keys(command.args));
    for (const key of Reflect.ownKeys(args)) {
      if (typeof key !== 'string' || !expectedKeys.has(key)) {
        throw new BaseError({
          message: `Command "${command.id}" received unknown argument "${String(key)}".`,
        });
      }
    }

    for (const [key, validator] of Object.entries(command.args)) {
      const value = Object.hasOwn(args, key) ? args[key] : undefined;
      if (!validator.validate(value)) {
        throw new BaseError({
          message: `Command "${command.id}" received an invalid "${key}" argument; expected ${validator.typeName}.`,
        });
      }
    }
  }

  private getDefaultArgs(command: Command): null | Record<string, undefined> {
    if (command.args === null) {
      return null;
    }

    return Object.fromEntries(
      Object.keys(command.args).map((key) => [key, undefined]),
    );
  }

  private settleSuccess(
    command: Command,
    from: string,
    options?: { overrideAutoFocus?: boolean },
    state?: { settled: boolean },
  ): CommandExecutionResult {
    if (state) {
      state.settled = true;
    }
    const result: CommandExecutionResult = {
      type: 'success',
      command,
      from,
    };
    this.onCommandResult(result);
    this.focusAfterSettle(command, options);
    return result;
  }

  private settleFailure(
    command: Command | undefined,
    commandId: string,
    from: string,
    options: { overrideAutoFocus?: boolean } | undefined,
    error: unknown,
    state?: { settled: boolean },
    reportAppError = false,
  ): CommandExecutionResult {
    if (state) {
      state.settled = true;
    }
    const result: CommandExecutionResult = {
      type: 'failure',
      ...(command ? { command } : {}),
      commandId,
      from,
      error,
    };

    if (command) {
      this.onCommandResult({ type: 'failure', command, from });
      this.focusAfterSettle(command, options);
    }
    if (reportAppError) {
      this.reportAppErrorOnce(error);
    }
    return result;
  }

  private focusAfterSettle(
    command: Command,
    options?: { overrideAutoFocus?: boolean },
  ): void {
    const autoFocus =
      options?.overrideAutoFocus ??
      command.autoFocusEditor ??
      Boolean(command.omniSearch);

    if (autoFocus) {
      this.config.focusEditor();
    }
  }

  private reportAppErrorOnce(error: unknown): void {
    if (!isAppError(error) || this.handledAppErrors.has(error)) {
      return;
    }
    this.handledAppErrors.add(error);
    this.emitAppError(error);
  }

  private setCommandContext(
    command: Command,
    key: CommandKey<string>,
    ancestry: readonly string[],
    state: { settled: boolean },
  ): void {
    const context: CommandHandlerContext = {
      store: this.store,
      dispatch: (childId: string, args: unknown) => {
        const child = this.beginChildExecution(
          command,
          childId,
          args,
          ancestry,
          state,
          false,
        );
        void child.result;
        if (child.synchronousError) {
          throw child.synchronousError.error;
        }
      },
      execute: (childId: string, args: unknown) => {
        return this.beginChildExecution(
          command,
          childId,
          args,
          ancestry,
          state,
          true,
        ).result;
      },
    };
    commandKeyToContext.set(key, { context });
  }

  private beginChildExecution(
    parent: Command,
    childId: string,
    args: unknown,
    ancestry: readonly string[],
    state: { settled: boolean },
    reportSynchronousAppError: boolean,
  ): {
    result: Promise<CommandExecutionResult>;
    synchronousError?: { error: unknown };
  } {
    if (childId === parent.id) {
      const error = new BaseError({
        message: `Command "${parent.id}" is trying to dispatch itself.`,
      });
      return {
        result: Promise.resolve({
          type: 'failure',
          commandId: childId,
          from: parent.id,
          error,
        }),
        synchronousError: { error },
      };
    }

    if (!parent.dependencies?.commands?.includes(childId)) {
      const error = new BaseError({
        message: `Command "${parent.id}" is trying to dispatch "${childId}" which is not allowed.`,
      });
      return {
        result: Promise.resolve({
          type: 'failure',
          commandId: childId,
          from: parent.id,
          error,
        }),
        synchronousError: { error },
      };
    }

    return this.beginExecution({
      id: childId,
      args,
      from: parent.id,
      options: undefined,
      // Dialog callbacks can intentionally use their command key after the
      // original handler settles. Those launches are new roots, while calls
      // made during an active handler retain its async ancestry.
      ancestry: state.settled ? [] : [...ancestry, parent.id],
      reportSynchronousAppError,
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
