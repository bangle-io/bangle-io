import type { BaseService } from '@bangle.io/base-utils';
import type { InferType, Validator } from '@bangle.io/mini-zod';
import type { CommandExposedServices, Store } from './services';

// To keep things simple we are only allowing a select few types
export type AllowedValidator =
  | Validator<string>
  | Validator<number>
  | Validator<boolean>
  | Validator<string[]>
  | Validator<string | boolean | undefined>;

export type Command = {
  id: string;
  title?: string;
  description?: string;
  icon?: string;
  disabled?: boolean;
  keywords?: string[];
  keybindings?: string[];
  dependencies?: {
    /**
     * The services that are required to be available in the command handler ctx
     */
    services?: (keyof CommandExposedServices)[];
    /**
     * The commands that the handler is allowed to dispatch
     */
    commands?: string[];
  };
  // whether the command is available in the omni search
  // default is false
  omniSearch?: boolean;
  //   the args type info when dispatching this command
  args: {
    [key: string]: AllowedValidator;
  } | null;
};

export type CommandHandlerContext = {
  store: Store;
  dispatch: (commandId: string, args: any) => void;
};
export type CommandHandler = (
  services: Record<string, BaseService>,
  args: any,
  key: CommandKey<string>,
) => void | Promise<void>;

export type CommandKey<T extends string> = { key: T };

export type CommandDispatchResult = {
  type: 'success' | 'failure';
  command: Command;
  from: string;
};

export type CommandArgs<C extends Command> = C['args'] extends null
  ? null
  : {
      [K in keyof C['args']]: C['args'][K] extends Validator<any>
        ? InferType<C['args'][K]>
        : never;
    };
