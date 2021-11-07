import { useButton } from '@react-aria/button';
import { useHover } from '@react-aria/interactions';
import { mergeProps } from '@react-aria/utils';
import { AriaButtonProps } from '@react-types/button';
import React, { ReactNode, useRef } from 'react';

import { cx } from '@bangle.io/utils';

export function Button({
  activeColor = 'var(--uiBangleButton-active-color)',
  animateOnPress = false,
  bgOnHover = false,
  children,
  className,
  color = 'var(--uiBangleButton-color)',
  hoverBgColor = 'var(--uiBangleButton-hover-bgColor)',
  hoverColor = 'var(--uiBangleButton-hover-color)',
  isRounded = false,
  isActive,
  isDisabled,
  onPress,
  pressedBgColor = 'var(--uiBangleButton-pressed-bgColor)',
  ariaLabel,
  style = {},
}: {
  activeColor?: string;
  animateOnPress?: boolean;
  isRounded?: boolean;
  bgOnHover?: boolean;
  children: ReactNode;
  className?: string;
  color?: string;
  hoverBgColor?: string;
  hoverColor?: string;
  isActive?: boolean;
  isDisabled?: boolean;
  onPress: () => void;
  ariaLabel?: string;
  pressedBgColor?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const { buttonProps, isPressed } = useButton(
    { 'aria-label': ariaLabel, onPress, isDisabled },
    ref,
  );
  const { hoverProps, isHovered } = useHover({ isDisabled });

  style = { ...style };

  style.color = color;

  if (isActive) {
    style.color = activeColor;
  }

  if (isHovered) {
    style.color = hoverColor;
    if (bgOnHover) {
      style.backgroundColor = hoverBgColor;
    }
  }

  if (animateOnPress && isPressed) {
    style.backgroundColor = pressedBgColor;
    style.transform = 'scale(var(--uiBangleButton-depression))';
  }

  if (isRounded) {
    style.borderRadius = 'var(--uiBangleButton-radius)';
  }

  return (
    <button
      {...mergeProps(buttonProps, hoverProps)}
      className={cx(
        'ui-bangle-button_button p-1 ',
        'transition-all duration-200',
        animateOnPress && 'animate-on-press',
        className,
        isActive && 'is-active',
        isDisabled && 'is-disabled',
        isDisabled && 'cursor-not-allowed',
        isHovered && 'is-hovered',
        isPressed && 'is-pressed',
        isHovered && bgOnHover && 'bg-on-hover',
      )}
      style={style}
      ref={ref}
    >
      {children}
    </button>
  );
}
