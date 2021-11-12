import React, { useCallback } from 'react';

import type { DispatchActionType } from '@bangle.io/action-context';
import {
  CORE_ACTIONS_NEW_NOTE,
  CORE_ACTIONS_NEW_WORKSPACE,
  CORE_ACTIONS_TOGGLE_THEME,
  CORE_PALETTES_TOGGLE_ACTION_PALETTE,
  CORE_PALETTES_TOGGLE_NOTES_PALETTE,
  CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE,
} from '@bangle.io/constants';
import type { ActionKeybindingMapping } from '@bangle.io/shared-types';
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
  dispatchAction,
  actionKeybindings,
}: {
  widescreen: boolean;
  dispatchAction: DispatchActionType;
  actionKeybindings: ActionKeybindingMapping;
}) {
  const onAction = useCallback(
    (k: any) => {
      let key: AllKeysType = k;
      switch (key) {
        case ActionPaletteKey: {
          dispatchAction({
            name: CORE_PALETTES_TOGGLE_ACTION_PALETTE,
          });
          break;
        }
        case NewNoteKey: {
          dispatchAction({
            name: CORE_ACTIONS_NEW_NOTE,
          });
          break;
        }
        case NewWorkspaceKey: {
          dispatchAction({
            name: CORE_ACTIONS_NEW_WORKSPACE,
          });
          break;
        }
        case NotesPaletteKey: {
          dispatchAction({
            name: CORE_PALETTES_TOGGLE_NOTES_PALETTE,
          });
          break;
        }
        case ReportIssueKey: {
          window?.open(
            'https://github.com/bangle-io/bangle-io-issues',
            '_blank',
          );
          break;
        }
        case SwitchWorkspaceKey: {
          dispatchAction({
            name: CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE,
          });
          break;
        }
        case ToggleThemeKey: {
          dispatchAction({
            name: CORE_ACTIONS_TOGGLE_THEME,
          });
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
    [dispatchAction],
  );

  console.log(
    actionKeybindings,
    actionKeybindings[CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE] || '',
  );
  return (
    <DropdownMenu
      isButtonQuiet
      menuPlacement="right-start"
      ariaLabel={'Options dropdown'}
      buttonAriaLabel={'Options'}
      buttonStyling={buttonStyling}
      buttonClassName={cx(
        'w-full py-3 rounded-sm flex justify-center activitybar_button',
        widescreen && 'widescreen',
      )}
      buttonChildren={<SettingsIcon className="h-7 w-7" />}
      onAction={onAction}
    >
      <MenuSection aria-label="misc">
        <MenuItem aria-label="new note" key={NewNoteKey}>
          New note
        </MenuItem>
        <MenuItem key={NewWorkspaceKey}>New workspace</MenuItem>
        <MenuItem key={SwitchWorkspaceKey} textValue="switch workspace">
          <span>Switch workspace</span>
          <PrettyKeybinding
            rawKey={
              actionKeybindings[CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE] || ''
            }
          />
        </MenuItem>
      </MenuSection>
      <MenuSection aria-label="ui">
        <MenuItem key={ToggleThemeKey}>Toggle dark theme</MenuItem>
      </MenuSection>
      <MenuSection aria-label="palettes">
        <MenuItem key={NotesPaletteKey} textValue="notes palette">
          <span>Notes palette</span>
          <PrettyKeybinding
            rawKey={actionKeybindings[CORE_PALETTES_TOGGLE_NOTES_PALETTE] || ''}
          />
        </MenuItem>
        <MenuItem key={ActionPaletteKey} textValue="action palette">
          <span>Action palette</span>
          <PrettyKeybinding
            rawKey={
              actionKeybindings[CORE_PALETTES_TOGGLE_ACTION_PALETTE] || ''
            }
          />
        </MenuItem>
      </MenuSection>
      <MenuSection aria-label="links">
        <MenuItem key={ReportIssueKey} textValue="report issue">
          <span>Report issue</span>
          <BangleIcon className="w-5 h-5" />
        </MenuItem>
        <MenuItem key={TwitterKey} textValue="follow twitter">
          <span>Twitter</span>
          <TwitterIcon className="w-5 h-5" />
        </MenuItem>
        <MenuItem key={DiscordKey} textValue="join discord">
          <span>Discord</span>
          <DiscordIcon className="w-5 h-5" />
        </MenuItem>
      </MenuSection>
    </DropdownMenu>
  );
}
