import type { BangleAppCommand } from '@bangle.io/commands';
import type { InferType, Validator } from '@bangle.io/mini-zod';
import type {
  Command,
  CommandExposedServices,
  CommandHandler,
} from '@bangle.io/types';

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
