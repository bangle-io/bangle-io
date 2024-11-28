import type { Command } from '@bangle.io/types';

// this is just for helping typescript narrow down the types
export function narrow<const T extends Command[]>(commands: T): T {
  return commands;
}
