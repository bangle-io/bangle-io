import React, { ReactNode, useRef } from 'react';

import {
  Button as ToggleButton,
  TooltipWrapper,
} from '@bangle.io/ui-bangle-button';
import { cx } from '@bangle.io/utils';

export function ActivitybarButton({
  isActive,
  widescreen,
  icon,
  hint,
  onPress,
}: {
  widescreen: boolean;
  hint: string;
  isActive?: boolean;
  onPress: () => void;
  icon: ReactNode;
}) {
  return (
    <ToggleButton
      isActive={isActive}
      animateOnPress={true}
      className={cx(
        'w-full py-3 rounded-sm flex justify-center activitybar_button',
        widescreen && 'widescreen',
      )}
      onPress={onPress}
      ariaLabel={hint}
      tooltip={<TooltipWrapper>{hint}</TooltipWrapper>}
      tooltipDelay={250}
      tooltipPlacement="right"
      tooltipOffset={5}
      activeColor="var(--activitybar-button-active-color)"
      color="var(--activitybar-button-color)"
      hoverBgColor="var(--activitybar-button-hover-bgColor)"
      hoverColor="var(--activitybar-button-hover-color)"
      pressedBgColor="var(--activitybar-button-pressed-bgColor)"
    >
      {icon}
    </ToggleButton>
  );
}
