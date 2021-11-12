import React, { ReactNode, useCallback } from 'react';

import { cx } from '@bangle.io/utils';

export type StylingProps = {
  activeColor?: string;
  animateOnPress?: boolean;
  bgOnHover?: boolean;
  buttonBgColor?: string;
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
  isQuiet: 'hoverBg' | boolean | undefined;
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
  isQuiet,
  style,
  onElementReady,
  ...otherProps
}: BaseButtonProps) => {
  const {
    animateOnPress = false,
    activeColor = 'var(--uiBangleButton-active-color)',
    color = 'var(--uiBangleButton-color)',
    buttonBgColor = 'var(--uiBangleButton-bgColor)',
    hoverBgColor = 'var(--uiBangleButton-hover-bgColor)',
    hoverColor = 'var(--uiBangleButton-hover-color)',
    pressedBgColor = 'var(--uiBangleButton-pressed-bgColor)',
  } = styling;

  style = { ...style };
  style.color = color;
  if (isActive) {
    style.color = activeColor;
  }

  if (!isQuiet) {
    style.backgroundColor = buttonBgColor;
  }

  if (isHovered) {
    style.color = hoverColor;
    if (!isQuiet || isQuiet === 'hoverBg') {
      style.backgroundColor = hoverBgColor;
    }
  }

  if (isPressed) {
    style.backgroundColor = pressedBgColor;
    if (animateOnPress) {
      style.transform = 'scale(var(--uiBangleButton-depression))';
    }
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
        'transition-all duration-100',
        animateOnPress && 'animate-on-press',
        isActive && 'is-active',
        isDisabled && 'is-disabled',
        isDisabled && 'cursor-not-allowed',
        isHovered && 'is-hovered',
        isPressed && 'is-pressed',
        isHovered && 'bg-on-hover',
        isQuiet && 'is-quiet',
      )}
      style={style}
      ref={_onElementReady}
    >
      {children}
    </button>
  );
};
