// index.commandExcludedServices@bangle.ioconstants
// index.test.ts

import { describe, expect, it } from 'vitest';

import { assertIsDefined } from '@bangle.io/base-utils';
import { commandExcludedServices } from '@bangle.io/constants';
import { T } from '@bangle.io/mini-zod';
import type { Command } from '@bangle.io/types';
import { areAllValuesOptional, bangleAppCommands } from '../index';

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
        if (command.args !== null && areAllValuesOptional(command.args)) {
          continue;
        }
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

  it('should return false when some args are not optional', () => {
    const commandWithMixedArgs: Command = {
      id: 'command::test:mixed-args',
      title: 'Test Mixed Args',
      omniSearch: true,
      services: ['database'],
      args: {
        param1: T.String,
        param2: T.Optional(T.String),
      },
    };

    assertIsDefined(commandWithMixedArgs.args);

    expect(areAllValuesOptional(commandWithMixedArgs.args)).toBe(false);
  });

  it('should confirm all args values are optional', () => {
    const commandWithMixedArgs: Command = {
      id: 'command::test:mixed-args',
      title: 'Test Mixed Args',
      omniSearch: true,
      services: ['database'],
      args: {
        param1: T.Optional(T.String),
        param2: T.Optional(T.String),
      },
    };

    assertIsDefined(commandWithMixedArgs.args);

    expect(areAllValuesOptional(commandWithMixedArgs.args)).toBe(true);
  });
});
