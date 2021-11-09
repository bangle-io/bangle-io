import React, { useCallback } from 'react';

import { useActionContext } from '@bangle.io/action-context';
import {
  DropdownMenu,
  MenuItem,
  MenuSection,
} from '@bangle.io/ui-bangle-button';
import { SettingsIcon } from '@bangle.io/ui-components';
import { cx } from '@bangle.io/utils';

import { buttonStyling } from './ActivitybarButton';

const ActionPaletteKey = 'ActionPalette';
const NewNoteKey = 'NewNote';
const NotesPaletteKey = 'NotesPalette';
const ReportIssueKey = 'ReportIssue';
const SwitchWorkspaceKey = 'SwitchWorkspace';
const ToggleThemeKey = 'ToggleTheme';

type AllKeysType =
  | typeof ActionPaletteKey
  | typeof NewNoteKey
  | typeof NotesPaletteKey
  | typeof ReportIssueKey
  | typeof SwitchWorkspaceKey
  | typeof ToggleThemeKey;

export function ActivitybarSettingsDropdown({
  widescreen,
}: {
  widescreen: boolean;
}) {
  const { dispatchAction } = useActionContext();

  const onAction = useCallback(
    (k: any) => {
      let key: AllKeysType = k;
      switch (key) {
        case ActionPaletteKey: {
          dispatchAction({
            name: 'action::bangle-io-core-palettes:TOGGLE_ACTION_PALETTE',
          });
          break;
        }
        case NewNoteKey: {
          dispatchAction({
            name: 'action::bangle-io-core-actions:NEW_NOTE_ACTION',
          });
          break;
        }
        case NotesPaletteKey: {
          dispatchAction({
            name: 'action::bangle-io-core-palettes:TOGGLE_NOTES_PALETTE',
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
            name: 'action::bangle-io-core-palettes:TOGGLE_WORKSPACE_PALETTE',
          });
          break;
        }
        case ToggleThemeKey: {
          dispatchAction({
            name: 'action::bangle-io-core-actions:TOGGLE_THEME_ACTION',
          });
          break;
        }
        default: {
          throw new Error('Unknown menu key type ' + key);
        }
      }
    },
    [dispatchAction],
  );

  return (
    <DropdownMenu
      menuPlacement="right-start"
      ariaLabel={'Options'}
      buttonStyling={buttonStyling}
      buttonClassName={cx(
        'w-full py-3 rounded-sm flex justify-center activitybar_button',
        widescreen && 'widescreen',
      )}
      buttonChildren={<SettingsIcon className="h-7 w-7" />}
      onAction={onAction}
    >
      <MenuSection aria-label="misc">
        <MenuItem key={NewNoteKey}>New note</MenuItem>
        <MenuItem key={ToggleThemeKey}>Toggle dark theme</MenuItem>
      </MenuSection>
      <MenuSection aria-label="palettes">
        <MenuItem key={NotesPaletteKey}>Notes palette</MenuItem>
        <MenuItem key={ActionPaletteKey}>Action palette</MenuItem>
        <MenuItem key={SwitchWorkspaceKey}>Switch workspace</MenuItem>
      </MenuSection>
      <MenuSection aria-label="links">
        <MenuItem key={ReportIssueKey}>Report issue</MenuItem>
      </MenuSection>
    </DropdownMenu>
  );
}
