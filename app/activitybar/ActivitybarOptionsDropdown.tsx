import React, { useCallback } from 'react';

import { useSerialOperationContext } from '@bangle.io/api';
import { vars } from '@bangle.io/atomic-css';
import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import {
  CHANGELOG_MODAL_NAME,
  CORE_OPERATIONS_NEW_NOTE,
  CORE_OPERATIONS_NEW_WORKSPACE,
  CORE_PALETTES_TOGGLE_NOTES_PALETTE,
  CORE_PALETTES_TOGGLE_OPERATION_PALETTE,
  CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE,
  CorePalette,
} from '@bangle.io/constants';
import type { SidebarType } from '@bangle.io/extension-registry';
import type { SerialOperationKeybindingMapping } from '@bangle.io/shared-types';
import {
  changeSidebar,
  togglePaletteType,
  toggleTheme,
} from '@bangle.io/slice-ui';
import {
  DropdownMenu,
  MenuItem,
  MenuSection,
} from '@bangle.io/ui-bangle-button';
import {
  BangleIcon,
  DiscordIcon,
  DotsVerticalIcon,
  GiftIcon,
  PrettyKeybinding,
  SettingsIcon,
  TwitterIcon,
} from '@bangle.io/ui-components';
import { cx } from '@bangle.io/utils';

export const ActionPaletteKey = 'ActionPalette';
export const DiscordKey = 'Discord';
export const NewNoteKey = 'NewNote';
export const NewWorkspaceKey = 'NewWorkspace';
export const NotesPaletteKey = 'NotesPalette';
export const ReportIssueKey = 'ReportIssue';
export const SwitchWorkspaceKey = 'SwitchWorkspace';
export const ToggleThemeKey = 'ToggleTheme';
export const TwitterKey = 'Twitter';
export const WhatsNewKey = 'WhatsNewKey';

type AllKeysType =
  | typeof ActionPaletteKey
  | typeof DiscordKey
  | typeof NewNoteKey
  | typeof NewWorkspaceKey
  | typeof NotesPaletteKey
  | typeof ReportIssueKey
  | typeof SwitchWorkspaceKey
  | typeof ToggleThemeKey
  | typeof TwitterKey
  | typeof WhatsNewKey;

const buttonStyling = {
  animateOnPress: true,
  activeColor: vars.color.app.activitybarText,
  color: vars.color.app.activitybarText,
  hoverBgColor: vars.color.app.activitybarBtnPress,
  hoverColor: vars.color.app.activitybarText,
  pressedBgColor: vars.color.app.activitybarBtnPress,
};

export function ActivitybarOptionsDropdown({
  widescreen,
  operationKeybindings,
  sidebarItems,
  activeSidebar,
}: {
  widescreen: boolean;
  operationKeybindings: SerialOperationKeybindingMapping;
  sidebarItems?: SidebarType[];
  activeSidebar?: string;
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
          window.open(
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
          window.open('https://discord.gg/GvvbWJrVQY', '_blank');
          break;
        }
        case TwitterKey: {
          window.open('https://twitter.com/bangle_io', '_blank');
          break;
        }
        case WhatsNewKey: {
          store.dispatch({
            name: 'action::@bangle.io/slice-ui:SHOW_DIALOG',
            value: {
              dialogName: CHANGELOG_MODAL_NAME,
            },
          });
          break;
        }
        default: {
          const match = sidebarItems?.find((i) => i.name === k);

          if (match) {
            if (match.name !== activeSidebar) {
              changeSidebar(match.name)(store.state, store.dispatch);
            }
          }
        }
      }
    },
    [store, activeSidebar, dispatchSerialOperation, sidebarItems],
  );

  const sidebarChildren: any =
    sidebarItems?.map((item) => {
      return (
        <MenuItem
          key={item.name}
          textValue={item.title}
          aria-label={item.title}
        >
          {item.title}
          {React.cloneElement(item.activitybarIcon, {
            className:
              (item.activitybarIcon.props.className || '') + ' w-5 h-5',
          })}
        </MenuItem>
      );
    }) || null;

  return (
    <DropdownMenu
      isButtonQuiet
      menuPlacement={widescreen ? 'right-start' : 'bottom-start'}
      ariaLabel={'options dropdown'}
      buttonAriaLabel={'options menu'}
      buttonStyling={buttonStyling}
      buttonClassName={cx(
        'w-full py-3 rounded-sm flex justify-center',
        widescreen && 'BU_widescreen',
      )}
      buttonChildren={
        widescreen ? (
          <SettingsIcon className="h-7 w-7" />
        ) : (
          <DotsVerticalIcon className="h-5 w-5" />
        )
      }
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
          {widescreen && (
            <PrettyKeybinding
              rawKey={
                operationKeybindings[CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE] ||
                ''
              }
            />
          )}
        </MenuItem>
      </MenuSection>
      {sidebarChildren && (
        <MenuSection aria-label="activitybar section">
          {sidebarChildren}
        </MenuSection>
      )}
      <MenuSection aria-label="ui section">
        <MenuItem aria-label="Switch Dark/Light theme" key={ToggleThemeKey}>
          Switch Dark/Light theme
        </MenuItem>
      </MenuSection>
      <MenuSection aria-label="palettes">
        <MenuItem
          key={NotesPaletteKey}
          textValue="notes palette"
          aria-label="notes palette"
        >
          <span>Notes palette</span>
          {widescreen && (
            <PrettyKeybinding
              rawKey={
                operationKeybindings[CORE_PALETTES_TOGGLE_NOTES_PALETTE] || ''
              }
            />
          )}
        </MenuItem>
        <MenuItem
          key={ActionPaletteKey}
          textValue="operation palette"
          aria-label="operation palette"
        >
          <span>Operation palette</span>
          {widescreen && (
            <PrettyKeybinding
              rawKey={
                operationKeybindings[CORE_PALETTES_TOGGLE_OPERATION_PALETTE] ||
                ''
              }
            />
          )}
        </MenuItem>
      </MenuSection>
      <MenuSection aria-label="links section">
        <MenuItem
          key={WhatsNewKey}
          textValue="whats new"
          aria-label="whats new"
        >
          <span>Whats new</span>
          <GiftIcon className="w-5 h-5" />
        </MenuItem>
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
