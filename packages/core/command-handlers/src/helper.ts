import { throwAppError } from '@bangle.io/base-utils';
import type { BangleAppCommand } from '@bangle.io/commands';
import { commandKeyToContext } from '@bangle.io/constants';
import {
  type CommandExposedServices,
  useCoreServices,
} from '@bangle.io/context';

import type { InferType, Validator } from '@bangle.io/mini-js-utils';
import type {
  Command,
  CommandExecutionResult,
  CommandHandler,
  CommandKey,
  Store,
} from '@bangle.io/types';
import { useEffect } from 'react';

type CommandArgs<C extends Command> = C['args'] extends null
  ? null
  : {
      [K in keyof C['args']]: C['args'][K] extends Validator<unknown>
        ? InferType<C['args'][K]>
        : never;
    };

export function c<const T extends BangleAppCommand['id']>(
  id: T,
  handler: (
    services: Pick<
      CommandExposedServices,
      Extract<BangleAppCommand, { id: T }>['dependencies']['services'][number]
    >,
    args: CommandArgs<Extract<BangleAppCommand, { id: T }>>,
    commandKey: CommandKey<NoInfer<T>>,
  ) => void | Promise<void>,
): {
  id: T;
  handler: CommandHandler;
} {
  return {
    id,
    handler: handler as CommandHandler,
  };
}

export function useC<T extends BangleAppCommand['id']>(
  id: T,
  handler: (
    services: Pick<
      CommandExposedServices,
      Extract<BangleAppCommand, { id: T }>['dependencies']['services'][number]
    >,
    args: CommandArgs<Extract<BangleAppCommand, { id: T }>>,
    commandKey: CommandKey<NoInfer<T>>,
  ) => void | Promise<void>,
) {
  const coreServices = useCoreServices();

  useEffect(() => {
    const unregister = coreServices.commandRegistry.registerHandler({
      id,
      handler: handler as CommandHandler,
    });
    return unregister;
  }, [id, coreServices, handler]);
}

type ChildCommandsIds<T extends string> = Extract<
  BangleAppCommand,
  { id: T }
>['dependencies'] extends {
  commands?: Array<infer C>;
}
  ? C extends string
    ? C
    : never
  : never;

export type ChildDispatcher<TParent extends BangleAppCommand['id']> = <
  TId extends ChildCommandsIds<TParent>,
>(
  id: TId,
  args: CommandArgs<Extract<BangleAppCommand, { id: TId }>>,
) => void;

export type ChildExecutor<TParent extends BangleAppCommand['id']> = <
  TId extends ChildCommandsIds<TParent>,
>(
  id: TId,
  args: CommandArgs<Extract<BangleAppCommand, { id: TId }>>,
) => Promise<CommandExecutionResult>;

export function getCtx<T extends BangleAppCommand['id']>(
  key: CommandKey<T>,
): {
  store: Store;
  dispatch: ChildDispatcher<T>;
  execute: ChildExecutor<T>;
} {
  const result = commandKeyToContext.get(key);
  if (!result) {
    throwAppError('error::command:unregistered', 'Command not registered', {
      commandId: key.key,
    });
  }
  return {
    dispatch: result.context.dispatch,
    execute: result.context.execute,
    store: result.context.store,
  };
}
