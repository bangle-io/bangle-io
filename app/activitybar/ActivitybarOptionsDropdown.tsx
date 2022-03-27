import React, { useCallback } from 'react';

import { useSerialOperationContext } from '@bangle.io/api';
import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import {
  CORE_OPERATIONS_NEW_NOTE,
  CORE_OPERATIONS_NEW_WORKSPACE,
  CORE_PALETTES_TOGGLE_NOTES_PALETTE,
  CORE_PALETTES_TOGGLE_OPERATION_PALETTE,
  CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE,
  CorePalette,
} from '@bangle.io/constants';
import type { SerialOperationKeybindingMapping } from '@bangle.io/shared-types';
import { togglePaletteType, toggleTheme } from '@bangle.io/slice-ui';
import {
  DropdownMenu,
  MenuItem,
  MenuSection,
} from '@bangle.io/ui-bangle-button';
import {
  BangleIcon,
  DiscordIcon,
  PrettyKeybinding,
  SettingsIcon,
  TwitterIcon,
} from '@bangle.io/ui-components';
import { cx } from '@bangle.io/utils';

import { buttonStyling } from './ActivitybarButton';

export const ActionPaletteKey = 'ActionPalette';
export const NewNoteKey = 'NewNote';
export const NewWorkspaceKey = 'NewWorkspace';
export const NotesPaletteKey = 'NotesPalette';
export const ReportIssueKey = 'ReportIssue';
export const SwitchWorkspaceKey = 'SwitchWorkspace';
export const ToggleThemeKey = 'ToggleTheme';
export const TwitterKey = 'Twitter';
export const DiscordKey = 'Discord';

type AllKeysType =
  | typeof ActionPaletteKey
  | typeof NewNoteKey
  | typeof NewWorkspaceKey
  | typeof NotesPaletteKey
  | typeof ReportIssueKey
  | typeof SwitchWorkspaceKey
  | typeof ToggleThemeKey
  | typeof TwitterKey
  | typeof DiscordKey;

export function ActivitybarOptionsDropdown({
  widescreen,
  operationKeybindings,
}: {
  widescreen: boolean;
  operationKeybindings: SerialOperationKeybindingMapping;
}) {
  const store = useBangleStoreContext();

  const { dispatchSerialOperation } = useSerialOperationContext();

  const handleDropdown = useCallback(
    (k: any) => {
      let key: AllKeysType = k;
      switch (key) {
        case ActionPaletteKey: {
          togglePaletteType(CorePalette.Operation)(store.state, store.dispatch);
          break;
        }
        case NewNoteKey: {
          dispatchSerialOperation({
            name: CORE_OPERATIONS_NEW_NOTE,
          });
          break;
        }
        case NewWorkspaceKey: {
          dispatchSerialOperation({
            name: CORE_OPERATIONS_NEW_WORKSPACE,
          });
          break;
        }
        case NotesPaletteKey: {
          togglePaletteType(CorePalette.Notes)(store.state, store.dispatch);
          break;
        }
        case ReportIssueKey: {
          window?.open(
            'https://github.com/bangle-io/bangle-io/issues',
            '_blank',
          );
          break;
        }
        case SwitchWorkspaceKey: {
          togglePaletteType(CorePalette.Workspace)(store.state, store.dispatch);
          break;
        }
        case ToggleThemeKey: {
          toggleTheme()(store.state, store.dispatch);
          break;
        }
        case DiscordKey: {
          window?.open('https://discord.gg/GvvbWJrVQY', '_blank');
          break;
        }
        case TwitterKey: {
          window?.open('https://twitter.com/bangle_io', '_blank');
          break;
        }
        default: {
          // hack to catch switch slipping
          let val: never = key;
          throw new Error('Unknown menu key type ' + val);
        }
      }
    },
    [store, dispatchSerialOperation],
  );

  return (
    <DropdownMenu
      isButtonQuiet
      menuPlacement="right-start"
      ariaLabel={'options dropdown'}
      buttonAriaLabel={'options menu'}
      buttonStyling={buttonStyling}
      buttonClassName={cx(
        'w-full py-3 rounded-sm flex justify-center B-activitybar_button',
        widescreen && 'bu-widescreen',
      )}
      buttonChildren={<SettingsIcon className="h-7 w-7" />}
      onAction={handleDropdown}
    >
      <MenuSection aria-label="misc section">
        <MenuItem aria-label="new note" key={NewNoteKey}>
          New note
        </MenuItem>
        <MenuItem aria-label="new workspace" key={NewWorkspaceKey}>
          New workspace
        </MenuItem>
        <MenuItem
          aria-label="switch workspace"
          key={SwitchWorkspaceKey}
          textValue="switch workspace"
        >
          <span>Switch workspace</span>
          <PrettyKeybinding
            rawKey={
              operationKeybindings[CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE] || ''
            }
          />
        </MenuItem>
      </MenuSection>
      <MenuSection aria-label="ui section">
        <MenuItem aria-label="toggle dark theme" key={ToggleThemeKey}>
          Toggle dark theme
        </MenuItem>
      </MenuSection>
      <MenuSection aria-label="palettes">
        <MenuItem
          key={NotesPaletteKey}
          textValue="notes palette"
          aria-label="notes palette"
        >
          <span>Notes palette</span>
          <PrettyKeybinding
            rawKey={
              operationKeybindings[CORE_PALETTES_TOGGLE_NOTES_PALETTE] || ''
            }
          />
        </MenuItem>
        <MenuItem
          key={ActionPaletteKey}
          textValue="operation palette"
          aria-label="operation palette"
        >
          <span>Operation palette</span>
          <PrettyKeybinding
            rawKey={
              operationKeybindings[CORE_PALETTES_TOGGLE_OPERATION_PALETTE] || ''
            }
          />
        </MenuItem>
      </MenuSection>
      <MenuSection aria-label="links section">
        <MenuItem
          key={ReportIssueKey}
          textValue="report issue"
          aria-label="report issue"
        >
          <span>Report issue</span>
          <BangleIcon className="w-5 h-5" />
        </MenuItem>
        <MenuItem
          key={TwitterKey}
          textValue="follow twitter"
          aria-label="follow twitter"
        >
          <span>Twitter</span>
          <TwitterIcon className="w-5 h-5" />
        </MenuItem>
        <MenuItem
          key={DiscordKey}
          textValue="join discord"
          aria-label="join discord"
        >
          <span>Discord</span>
          <DiscordIcon className="w-5 h-5" />
        </MenuItem>
      </MenuSection>
    </DropdownMenu>
  );
}
