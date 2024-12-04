import { commandExcludedServices } from '@bangle.io/constants';
import type { Command } from '@bangle.io/types';

import type { Validator } from '@bangle.io/mini-zod';
import { uiCommands } from './ui-commands';
import { wsCommands } from './ws-commands';

export const bangleAppCommands = [...uiCommands, ...wsCommands];

export function getEnabledCommands(): Command[] {
  const commands: Command[] = bangleAppCommands;
  return commands.filter((command) => !command.disabled);
}

export type BangleAppCommand = (typeof bangleAppCommands)[number];

function validate(commands: Command[]) {
  const commandIds = new Set(commands.map((command) => command.id));

  for (const command of commands) {
    const excludedServices: string[] = commandExcludedServices;

    if (
      command.dependencies?.services?.some((service: string) =>
        excludedServices.includes(service),
      )
    ) {
      throw new Error(`Command "${command.id}" uses an excluded service.`);
    }

    if (command.omniSearch) {
      if (command.args !== null && !areAllValuesOptional(command.args)) {
        throw new Error(
          `Command "${command.id}" has omniSearch enabled but args contain non-optional parameters.`,
        );
      }
      if (!command.keywords) {
        throw new Error(
          `Command "${command.id}" has omniSearch enabled but no keywords.`,
        );
      }
    }

    if (
      Array.isArray(command.keybindings) &&
      command.args !== null &&
      !areAllValuesOptional(command.args)
    ) {
      throw new Error(
        `Command "${command.id}" has keybindings but has non-optional args.`,
      );
    }

    if (command.dependencies?.commands) {
      for (const depCommand of command.dependencies.commands) {
        if (!commandIds.has(depCommand)) {
          throw new Error(
            `Command "${command.id}" has an invalid dependency command "${depCommand}".`,
          );
        }
      }
    }
  }
}

validate(bangleAppCommands);

export function areAllValuesOptional(args: {
  [key: string]: Validator<any>;
}): boolean {
  return Object.values(args).every(
    (validator) => validator.isOptional === true,
  );
}
