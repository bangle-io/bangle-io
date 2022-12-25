import React from 'react';

import { vars } from '@bangle.io/atomic-css';
import {
  ActionButton,
  ButtonContent,
  TooltipWrapper,
} from '@bangle.io/ui-bangle-button';
import { cx } from '@bangle.io/utils';

export const buttonStyling = {
  animateOnPress: true,
  activeColor: vars.color.app.activitybarText,
  color: vars.color.app.activitybarText,
  hoverBgColor: vars.color.app.activitybarBtnPress,
  hoverColor: vars.color.app.activitybarText,
  pressedBgColor: vars.color.app.activitybarBtnPress,
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
        'w-full py-3 rounded-sm flex justify-center',
        widescreen && 'border-l-2 ',
        widescreen &&
          (isActive
            ? 'border-colorPromoteBorder'
            : 'border-colorAppActivitybarBg'),
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
