import { commandExcludedServices } from '@bangle.io/constants';
import type { Command } from '@bangle.io/types';

import { uiCommands } from './ui-commands';
import { wsCommands } from './ws-commands';

export const bangleAppCommands = [...uiCommands, ...wsCommands];

export function getEnabledCommands(): Command[] {
  const commands: Command[] = bangleAppCommands;
  return commands.filter((command) => !command.disabled);
}

export type BangleAppCommand = (typeof bangleAppCommands)[number];

function validate(commands: Command[]) {
  for (const command of commands) {
    const excludedServices: string[] = commandExcludedServices;

    if (
      command.services.some((service: string) =>
        excludedServices.includes(service),
      )
    ) {
      throw new Error(`Command "${command.id}" uses an excluded service.`);
    }

    if (command.omniSearch && !command.keywords) {
      throw new Error(
        `Command "${command.id}" has omniSearch enabled but no keywords.`,
      );
    }

    if (command.omniSearch && command.args !== null) {
      throw new Error(
        `Command "${command.id}" has omniSearch enabled but has non-null args.`,
      );
    }

    if (Array.isArray(command.keybindings) && command.args !== null) {
      throw new Error(
        `Command "${command.id}" has keybindings but has non-null args.`,
      );
    }
  }
}

validate(bangleAppCommands);
