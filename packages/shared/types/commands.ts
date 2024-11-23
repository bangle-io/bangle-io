import type { BaseService } from '@bangle.io/base-utils';
import type { Validator } from '@bangle.io/mini-zod';
import type { CommandExposedServices } from './services';

// To keep things simple we are only allowing a select few types
export type AllowedValidator =
  | Validator<string>
  | Validator<number>
  | Validator<boolean>
  | Validator<string[]>;

export type Command = {
  id: string;
  title?: string;
  description?: string;
  icon?: string;
  disabled?: boolean;
  keywords?: string[];
  keybindings?: string[];
  services: (keyof CommandExposedServices)[];
  //   whether the command is available in the omni search
  // default is false
  omniSearch?: boolean;
  args: {
    [key: string]: AllowedValidator;
  } | null;
};

export type CommandHandler = (
  services: Record<string, BaseService>,
  args: any,
) => void | Promise<void>;
