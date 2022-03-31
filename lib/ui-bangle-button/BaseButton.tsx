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
  disabledBgColor?: string;
  disabledColor?: string;
};

export type BaseButtonProps = {
  id?: string;
  variant?: 'primary' | 'secondary';
  styling: StylingProps;
  children: ReactNode;
  className: string;
  isActive: boolean | undefined;
  isQuiet: 'hoverBg' | boolean | undefined;
  isDisabled: boolean | undefined;
  isHovered: boolean;
  isPressed: boolean;
  style: React.CSSProperties;
  allowFocus?: boolean;
  onElementReady?: (el: HTMLButtonElement) => void;
  autoFocus?: boolean;
};

export const BaseButton = ({
  id,
  variant = 'secondary',
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
  allowFocus = true,
  autoFocus = false,
  ...otherProps
}: BaseButtonProps) => {
  const {
    animateOnPress = false,
    activeColor = variant === 'secondary'
      ? 'var(--BV-ui-bangle-button-active-color)'
      : 'var(--BV-ui-bangle-button-primary-active-color)',
    color = variant === 'secondary'
      ? 'var(--BV-ui-bangle-button-color)'
      : 'var(--BV-ui-bangle-button-primary-color)',
    buttonBgColor = variant === 'secondary'
      ? 'var(--BV-ui-bangle-button-bg-color)'
      : 'var(--BV-ui-bangle-button-primary-bg-color)',
    hoverBgColor = variant === 'secondary'
      ? 'var(--BV-ui-bangle-button-hover-bg-color)'
      : 'var(--BV-ui-bangle-button-primary-hover-bg-color)',
    hoverColor = variant === 'secondary'
      ? 'var(--BV-ui-bangle-button-hover-color)'
      : 'var(--BV-ui-bangle-button-primary-hover-color)',
    pressedBgColor = variant === 'secondary'
      ? 'var(--BV-ui-bangle-button-pressed-bg-color)'
      : 'var(--BV-ui-bangle-button-primary-pressed-bg-color)',
    disabledBgColor = 'var(--BV-ui-bangle-button-disabled-bg-color)',
    disabledColor = 'var(--BV-ui-bangle-button-disabled-color)',
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
      style.transform = 'scale(var(--BV-ui-bangle-button-depression))';
    }
  }

  if (isDisabled) {
    style.backgroundColor = disabledBgColor;
    style.color = disabledColor;
  }

  const _onElementReady = useCallback(
    (el) => {
      onElementReady?.(el);
    },
    [onElementReady],
  );

  return (
    <button
      id={id}
      autoFocus={autoFocus}
      {...otherProps}
      disabled={isDisabled}
      className={cx(
        className,
        'B-ui-bangle-button_button p-1 ',
        'transition-all duration-100',
        animateOnPress && 'animate-on-press',
        isActive && 'BU_is-active',
        isDisabled && 'cursor-not-allowed',
        isHovered && 'is-hovered',
        isPressed && 'is-pressed',
        isHovered && 'bg-on-hover',
        isQuiet && 'is-quiet',
        allowFocus && 'focus:outline-none focus:ring focus:border-blue-300',
      )}
      style={style}
      ref={_onElementReady}
    >
      {children}
    </button>
  );
};
