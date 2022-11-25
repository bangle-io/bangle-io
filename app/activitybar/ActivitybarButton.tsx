import React from 'react';

import { BlockButton } from '@bangle.io/ui-components/BlockButton/BlockButton';
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
    <BlockButton
      isActive={isActive}
      borderAccentPosition={widescreen ? 'left' : undefined}
      borderThickness={4}
      icon={icon}
      hint={hint}
      onPress={onPress}
      text={text}
      className={className}
    />
  );
}
