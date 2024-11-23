import { commandExcludedServices } from '@bangle.io/constants';
import type { Command } from '@bangle.io/types';

import { uiCommands } from './ui-commands';

export const bangleAppCommands = [...uiCommands];
export type BangleAppCommand = (typeof bangleAppCommands)[number];
function validate(commands: Command[]) {
  for (const command of commands) {
    if (!command.id.startsWith('command::')) {
      throw new Error(`Invalid command id: ${command.id}`);
    }

    const excludedServices: string[] = commandExcludedServices;

    if (
      command.services.some((service: string) =>
        excludedServices.includes(service),
      )
    ) {
      throw new Error(`Command "${command.id}" uses an excluded service.`);
    }
  }
}

validate(bangleAppCommands);
