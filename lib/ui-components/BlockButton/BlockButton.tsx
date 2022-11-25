import React from 'react';

import type { StylingProps } from '@bangle.io/ui-bangle-button';
import {
  ActionButton,
  ButtonContent,
  TooltipWrapper,
} from '@bangle.io/ui-bangle-button';
import { cx } from '@bangle.io/utils';

interface ButtonBorder {
  accentPosition?: 'top' | 'bottom' | 'left' | 'right';
  accentColor?: string;
  thickness?: number;
}

/**
 * A button which has a pressable area as shape of square
 */
export function BlockButton({
  border,
  className,
  hint,
  icon,
  isActive,
  onPress,
  styling,
  text,
}: {
  menu?: boolean;
  hint: string;
  isActive?: boolean;
  onPress: () => void;
  border?: ButtonBorder;
  icon: any;
  text?: string;
  className?: string;
  styling?: StylingProps;
}) {
  const {
    animateOnPress = true,
    activeColor = 'var(--BV-ui-bangle-button-active-color)',
    color = 'var(--BV-ui-bangle-button-color)',
    hoverBgColor = 'var(--BV-activitybar-button-hover-bg-color)',
    hoverColor = 'var(--BV-activitybar-button-hover-color)',
    pressedBgColor = 'var(--BV-activitybar-button-pressed-bg-color)',
    ...restStyling
  } = styling ?? {};

  const {
    accentColor = 'var(--BV-accent-primary-0)',
    thickness = 2,
    accentPosition,
  } = border ?? {};

  const style: React.CSSProperties = {};

  const borderColor = `${thickness}px solid ${
    isActive ? accentColor : 'transparent'
  }`;

  switch (accentPosition) {
    case 'top': {
      style.borderTop = borderColor;
      break;
    }
    case 'bottom': {
      style.borderBottom = borderColor;
      break;
    }
    case 'left': {
      style.borderLeft = borderColor;
      break;
    }
    case 'right': {
      style.borderRight = borderColor;
      break;
    }
    default: {
      break;
    }
  }

  return (
    <ActionButton
      isQuiet
      isActive={isActive}
      style={style}
      styling={{
        animateOnPress,
        activeColor,
        color,
        hoverBgColor,
        hoverColor,
        pressedBgColor,
        ...restStyling,
      }}
      className={cx(
        'w-full py-3 rounded-sm flex justify-center B-ui-components_block-button',
        className,
      )}
      onPress={onPress}
      ariaLabel={hint}
      tooltip={hint ? <TooltipWrapper>{hint}</TooltipWrapper> : null}
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
