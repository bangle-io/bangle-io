import React, { ReactNode, useCallback } from 'react';

import { cx } from '@bangle.io/utils';

export type StylingProps = {
  activeColor?: string;
  animateOnPress?: boolean;
  bgOnHover?: boolean;
  color?: string;
  hoverBgColor?: string;
  hoverColor?: string;
  isRounded?: boolean;
  pressedBgColor?: string;
};

export type BaseButtonProps = {
  styling: StylingProps;
  children: ReactNode;
  className: string;
  isActive: boolean | undefined;
  isDisabled: boolean | undefined;
  isHovered: boolean;
  isPressed: boolean;
  style: React.CSSProperties;
  onElementReady?: (el: HTMLButtonElement) => void;
};

export const BaseButton = ({
  children,
  className,
  styling,
  isActive,
  isDisabled,
  isHovered,
  isPressed,
  style,
  onElementReady,
  ...otherProps
}: BaseButtonProps) => {
  const {
    isRounded = false,
    animateOnPress = false,
    bgOnHover = false,
    activeColor = 'var(--uiBangleButton-active-color)',
    color = 'var(--uiBangleButton-color)',
    hoverBgColor = 'var(--uiBangleButton-hover-bgColor)',
    hoverColor = 'var(--uiBangleButton-hover-color)',
    pressedBgColor = 'var(--uiBangleButton-pressed-bgColor)',
  } = styling;

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

  const _onElementReady = useCallback(
    (el) => {
      onElementReady?.(el);
    },
    [onElementReady],
  );
  return (
    <button
      {...otherProps}
      className={cx(
        className,
        'ui-bangle-button_button p-1 ',
        'transition-all duration-200',
        animateOnPress && 'animate-on-press',
        isActive && 'is-active',
        isDisabled && 'is-disabled',
        isDisabled && 'cursor-not-allowed',
        isHovered && 'is-hovered',
        isPressed && 'is-pressed',
        isHovered && bgOnHover && 'bg-on-hover',
      )}
      style={style}
      ref={_onElementReady}
    >
      {children}
    </button>
  );
};
