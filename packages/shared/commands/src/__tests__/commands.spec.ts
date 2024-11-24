// index.commandExcludedServices@bangle.ioconstants
// index.test.ts

import { describe, expect, it } from 'vitest';

import { commandExcludedServices } from '@bangle.io/constants';
import type { Command } from '@bangle.io/types';
import { bangleAppCommands } from '../index';

const allCommands: Command[] = bangleAppCommands;

describe('Bangle App Commands Validation', () => {
  it('should have command IDs starting with "command::"', () => {
    expect.assertions(allCommands.length);
    for (const command of allCommands) {
      expect(command.id.startsWith('command::')).toBe(true);
    }
  });

  it('should not use any excluded services', () => {
    for (const command of allCommands) {
      for (const service of command.services) {
        expect(commandExcludedServices).not.toContain(service);
      }
    }
  });

  it('should have keywords when omniSearch is enabled', () => {
    for (const command of allCommands) {
      if (command.omniSearch) {
        expect(command.keywords).toBeDefined();
        expect(command.keywords?.length).toBeGreaterThan(0);
      }
    }
  });

  it('should have args as null when omniSearch is enabled', () => {
    for (const command of allCommands) {
      if (command.omniSearch) {
        expect(command.args).toBeNull();
      }
    }
  });

  it('should have args as null when keybindings are provided', () => {
    let assertionCount = 0;
    for (const command of allCommands) {
      if (Array.isArray(command.keybindings)) {
        assertionCount++;
        console.log(command.id);
        expect(command.args).toBeNull();
      }
    }
    expect(assertionCount).toBeGreaterThan(0);
  });
});
