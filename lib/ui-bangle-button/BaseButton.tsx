import { FocusRing } from '@react-aria/focus';
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
  variant?: 'primary' | 'secondary' | 'destructive';
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
  ...otherProps
}: BaseButtonProps) => {
  let {
    animateOnPress = false,
    activeColor,
    color,
    buttonBgColor,
    hoverBgColor,
    hoverColor,
    pressedBgColor,
    disabledBgColor = 'var(--BV-ui-bangle-button-disabled-bg-color)',
    disabledColor = 'var(--BV-ui-bangle-button-disabled-color)',
  } = styling;

  switch (variant) {
    case 'secondary': {
      ({
        activeColor = 'var(--BV-ui-bangle-button-active-color)',
        color = 'var(--BV-ui-bangle-button-color)',
        buttonBgColor = 'var(--BV-ui-bangle-button-bg-color)',
        hoverBgColor = 'var(--BV-ui-bangle-button-hover-bg-color)',
        hoverColor = 'var(--BV-ui-bangle-button-hover-color)',
        pressedBgColor = 'var(--BV-ui-bangle-button-pressed-bg-color)',
      } = styling);
      break;
    }

    case 'primary': {
      ({
        activeColor = 'var(--BV-ui-bangle-button-primary-active-color)',
        color = 'var(--BV-ui-bangle-button-primary-color)',
        buttonBgColor = 'var(--BV-ui-bangle-button-primary-bg-color)',
        hoverBgColor = 'var(--BV-ui-bangle-button-primary-hover-bg-color)',
        hoverColor = 'var(--BV-ui-bangle-button-primary-hover-color)',
        pressedBgColor = 'var(--BV-ui-bangle-button-primary-pressed-bg-color)',
      } = styling);
      break;
    }

    case 'destructive': {
      ({
        activeColor = 'var(--BV-ui-bangle-button-destructive-active-color)',
        color = 'var(--BV-ui-bangle-button-destructive-color)',
        buttonBgColor = 'var(--BV-ui-bangle-button-destructive-bg-color)',
        hoverBgColor = 'var(--BV-ui-bangle-button-destructive-hover-bg-color)',
        hoverColor = 'var(--BV-ui-bangle-button-destructive-hover-color)',
        pressedBgColor = 'var(--BV-ui-bangle-button-destructive-pressed-bg-color)',
      } = styling);
      break;
    }
  }

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
    <FocusRing focusRingClass="B-ui-components_misc-button-ring">
      <button
        type="button"
        id={id}
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
        )}
        style={style}
        ref={_onElementReady}
      >
        {children}
      </button>
    </FocusRing>
  );
};
