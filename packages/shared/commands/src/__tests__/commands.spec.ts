// index.commandExcludedServices@bangle.ioconstants
// index.test.ts

import { assertIsDefined } from '@bangle.io/base-utils';
import {
  commandExcludedServices,
  SETTINGS_DEFAULT_COMMAND,
  SETTINGS_PAGE_DEFINITIONS,
} from '@bangle.io/constants';
import { T } from '@bangle.io/mini-js-utils';
import type { Command, OmniSearchScope } from '@bangle.io/types';
import { describe, expect, it } from 'vitest';
import { areAllValuesOptional, bangleAppCommands } from '../index';

const allCommands: Command[] = bangleAppCommands;

const expectedOmniSearchCommandIds: Record<OmniSearchScope, string[]> = {
  global: [
    'command::ui:create-workspace-dialog',
    'command::ui:delete-workspace-dialog',
    'command::ui:open-settings',
    'command::ui:open-settings-general',
    'command::ui:open-settings-workspaces',
    'command::ui:reload-app',
    'command::ui:switch-editor-engine',
    'command::ui:switch-theme',
    'command::ui:switch-workspace',
    'command::ui:toggle-sidebar',
  ],
  workspace: [
    'command::ui:create-directory-dialog',
    'command::ui:create-note-dialog',
    'command::ui:toggle-all-files',
    'command::ws:daily-note',
    'command::ws:go-ws-home',
    'command::ws:quick-new-note',
    'command::ws:refresh-file-tree',
  ],
  note: [
    'command::editor:insert-table',
    'command::editor:toggle-heading-1',
    'command::editor:toggle-heading-2',
    'command::editor:toggle-heading-3',
    'command::ui:collapse-all-headings-1',
    'command::ui:collapse-all-headings-2',
    'command::ui:collapse-all-headings-3',
    'command::ui:copy-selection-as-markdown',
    'command::ui:delete-note-dialog',
    'command::ui:focus-editor',
    'command::ui:move-note-dialog',
    'command::ui:paste-from-markdown',
    'command::ui:rename-note-dialog',
    'command::ui:toggle-heading-collapse',
    'command::ui:toggle-wide-editor',
    'command::ui:uncollapse-all-headings',
    'command::workspace:toggle-star',
    'command::ws:clone-note',
  ],
};

describe('Bangle App Commands Validation', () => {
  it('should have command IDs starting with "command::"', () => {
    expect.assertions(allCommands.length);
    for (const command of allCommands) {
      expect(command.id.startsWith('command::')).toBe(true);
    }
  });

  it('should not use any excluded services', () => {
    for (const command of allCommands) {
      for (const service of command.dependencies?.services ?? []) {
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

  it('assigns every omni-search command to its required app scope', () => {
    for (const scope of ['global', 'workspace', 'note'] as const) {
      expect(
        allCommands
          .filter((command) => command.omniSearch === scope)
          .map((command) => command.id)
          .sort(),
      ).toEqual(expectedOmniSearchCommandIds[scope]);
    }
  });

  it('should return false when some args are not optional', () => {
    const commandWithMixedArgs: Command = {
      id: 'command::test:mixed-args',
      title: 'Test Mixed Args',
      omniSearch: 'global',
      dependencies: { services: ['navigation'] },
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
      omniSearch: 'global',
      dependencies: { services: ['navigation'] },
      args: {
        param1: T.Optional(T.String),
        param2: T.Optional(T.String),
      },
    };

    assertIsDefined(commandWithMixedArgs.args);

    expect(areAllValuesOptional(commandWithMixedArgs.args)).toBe(true);
  });

  it('should ensure if commands are provided they exist', () => {
    const commandIds = allCommands.map((command) => command.id);
    for (const command of allCommands) {
      for (const depCommand of command.dependencies?.commands ?? []) {
        expect(commandIds).toContain(depCommand);
      }
    }
  });

  it('should expose settings pages as omni-search commands', () => {
    const settingsCommands = allCommands
      .filter((command) => command.id.startsWith('command::ui:open-settings'))
      .map((command) => ({
        id: command.id,
        title: command.title,
        omniSearch: command.omniSearch,
      }));

    expect(settingsCommands).toEqual([
      {
        id: SETTINGS_DEFAULT_COMMAND.id,
        title: SETTINGS_DEFAULT_COMMAND.title,
        omniSearch: 'global',
      },
      ...SETTINGS_PAGE_DEFINITIONS.map((page) => ({
        id: page.commandId,
        title: page.commandTitle,
        omniSearch: 'global',
      })),
    ]);
  });
});
