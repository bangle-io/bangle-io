import React, { ReactNode } from 'react';

import {
  Button as ToggleButton,
  DropdownMenu,
  MenuItem,
  TooltipWrapper,
} from '@bangle.io/ui-bangle-button';
import { SettingsIcon } from '@bangle.io/ui-components';
import { cx } from '@bangle.io/utils';

let buttonStyling = {
  animateOnPress: true,
  activeColor: 'var(--activitybar-button-active-color)',
  color: 'var(--activitybar-button-color)',
  hoverBgColor: 'var(--activitybar-button-hover-bgColor)',
  hoverColor: 'var(--activitybar-button-hover-color)',
  pressedBgColor: 'var(--activitybar-button-pressed-bgColor)',
};

export function ActivitybarButton({
  isActive,
  widescreen,
  icon,
  hint,
  onPress,
}: {
  menu?: boolean;
  widescreen: boolean;
  hint: string;
  isActive?: boolean;
  // key if used in dropdowndow menu
  onPress: (k?: React.Key) => void;
  icon: ReactNode;
}) {
  return (
    <ToggleButton
      isActive={isActive}
      styling={buttonStyling}
      className={cx(
        'w-full py-3 rounded-sm flex justify-center activitybar_button',
        widescreen && 'widescreen',
      )}
      onPress={onPress}
      ariaLabel={hint}
      tooltip={<TooltipWrapper>{hint}</TooltipWrapper>}
      tooltipDelay={250}
      tooltipPlacement="right"
    >
      {icon}
    </ToggleButton>
  );
}

export function ActivitybarSettingsDropdown({
  widescreen,
  hint,
}: {
  widescreen: boolean;
  hint: string;
}) {
  return (
    <DropdownMenu
      menuPlacement="right-start"
      ariaLabel={hint}
      buttonStyling={buttonStyling}
      buttonClassName={cx(
        'w-full py-3 rounded-sm flex justify-center activitybar_button',
        widescreen && 'widescreen',
      )}
      buttonChildren={<SettingsIcon className="h-7 w-7" />}
      onAction={(k) => {
        console.log(k);
      }}
    >
      <MenuItem key="copy">Copy</MenuItem>
      <MenuItem key="cut">Cut</MenuItem>
      <MenuItem key="paste">Paste</MenuItem>
    </DropdownMenu>
  );
}
