import React from 'react';

import {
  ActionButton,
  ButtonContent,
  TooltipWrapper,
} from '@bangle.io/ui-bangle-button';
import { cx } from '@bangle.io/utils';

export const buttonStyling = {
  animateOnPress: true,
  activeColor: 'var(--BV-activitybar-button-active-color)',
  color: 'var(--BV-activitybar-button-color)',
  hoverBgColor: 'var(--BV-activitybar-button-hover-bg-color)',
  hoverColor: 'var(--BV-activitybar-button-hover-color)',
  pressedBgColor: 'var(--BV-activitybar-button-pressed-bg-color)',
};

export function ActivitybarButton({
  isActive,
  widescreen,
  icon,
  hint,
  onPress,
  text,
  className,
}: {
  menu?: boolean;
  widescreen: boolean;
  hint: string;
  isActive?: boolean;
  onPress: () => void;
  icon: any;
  text?: string;
  className?: string;
}) {
  return (
    <ActionButton
      isQuiet
      isActive={isActive}
      styling={buttonStyling}
      className={cx(
        'w-full py-3 rounded-sm flex justify-center B-activitybar_button',
        widescreen && 'BU_widescreen',
        className,
      )}
      onPress={onPress}
      ariaLabel={hint}
      tooltip={<TooltipWrapper>{hint}</TooltipWrapper>}
      tooltipDelay={150}
      tooltipPlacement="right"
      autoFocus={false}
    >
      <ButtonContent
        size="custom"
        icon={icon}
        text={text}
        textClassName="truncate capitalize"
      ></ButtonContent>
    </ActionButton>
  );
}
