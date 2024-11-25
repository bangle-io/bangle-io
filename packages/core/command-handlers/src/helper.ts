import type { BangleAppCommand } from '@bangle.io/commands';
import { useCoreServices } from '@bangle.io/context';
import type { InferType, Validator } from '@bangle.io/mini-zod';
import type {
  Command,
  CommandExposedServices,
  CommandHandler,
  Store,
} from '@bangle.io/types';
import { useEffect } from 'react';

type CommandArgs<C extends Command> = C['args'] extends null
  ? null
  : {
      [K in keyof C['args']]: C['args'][K] extends Validator<any>
        ? InferType<C['args'][K]>
        : never;
    };

export function c<T extends BangleAppCommand['id']>(
  id: T,
  handler: (
    services: Pick<
      CommandExposedServices,
      Extract<BangleAppCommand, { id: T }>['services'][number]
    >,
    args: CommandArgs<Extract<BangleAppCommand, { id: T }>>,
    context: {
      store: Store;
    },
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
      Extract<BangleAppCommand, { id: T }>['services'][number]
    >,
    args: CommandArgs<Extract<BangleAppCommand, { id: T }>>,
    context: {
      store: Store;
    },
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
