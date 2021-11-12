import React, { ReactNode } from 'react';

import { ActionButton, TooltipWrapper } from '@bangle.io/ui-bangle-button';
import { ButtonContent } from '@bangle.io/ui-bangle-button/ButtonContent';
import { cx } from '@bangle.io/utils';

export const buttonStyling = {
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
  icon: any;
}) {
  return (
    <ActionButton
      isQuiet
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
      <ButtonContent size="custom" icon={icon}></ButtonContent>
    </ActionButton>
  );
}
