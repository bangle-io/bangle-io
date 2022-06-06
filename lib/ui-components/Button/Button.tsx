import { useButton } from '@react-aria/button';
import { useFocusRing } from '@react-aria/focus';
import { useHover } from '@react-aria/interactions';
import { mergeProps } from '@react-aria/utils';
import type { ReactNode } from 'react';
import React, { useMemo, useRef } from 'react';

import type { FirstParameter } from '@bangle.io/shared-types';
import { cx, isTouchDevice } from '@bangle.io/utils';

import { BaseButton } from './BaseButton';

export type StylingProps = {
  buttonBgColor?: string;
  color?: string;
  hoverBgColor?: string;
  hoverColor?: string;
  pressedBgColor?: string;
  disabledBgColor?: string;
  disabledColor?: string;
};

export const Button = ({
  ariaLabel,
  autoFocus = false,
  children,
  className,
  id,
  isDisabled,
  isQuiet,
  onPress = () => {},
  animateOnPress = true,
  style: incomingStyle = {},
  styling = {},
  variant = 'secondary',
}: {
  ariaLabel: string;
  autoFocus?: boolean;
  children: ReactNode;
  className?: string;
  id?: string;
  animateOnPress?: boolean;
  isDisabled?: boolean;
  isQuiet?: 'hoverBg' | boolean;
  onPress?: FirstParameter<typeof useButton>['onPress'];
  style?: React.CSSProperties;
  styling?: StylingProps;
  variant?: 'primary' | 'secondary' | 'destructive';
}) => {
  let ref = useRef<HTMLButtonElement>(null);

  const { hoverProps, isHovered } = useHover({ isDisabled });
  // NOTE; focus ring is only shown for keyboard users
  // ie when they use keyboard to navigate the app
  let { isFocusVisible, focusProps } = useFocusRing({ autoFocus });

  const { buttonProps, isPressed } = useButton(
    {
      'aria-label': ariaLabel,
      onPress,
      isDisabled,
      'type': 'button',
      autoFocus,
    },
    ref,
  );

  const style = useMemo(() => {
    let {
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
          color = 'var(--BV-ui-bangle-button-destructive-color)',
          buttonBgColor = 'var(--BV-ui-bangle-button-destructive-bg-color)',
          hoverBgColor = 'var(--BV-ui-bangle-button-destructive-hover-bg-color)',
          hoverColor = 'var(--BV-ui-bangle-button-destructive-hover-color)',
          pressedBgColor = 'var(--BV-ui-bangle-button-destructive-pressed-bg-color)',
        } = styling);
        break;
      }
    }

    const result = { ...incomingStyle };
    result.color = color;

    if (!isQuiet) {
      result.backgroundColor = buttonBgColor;
    }

    if (isHovered) {
      result.color = hoverColor;

      if (!isQuiet || isQuiet === 'hoverBg') {
        result.backgroundColor = hoverBgColor;
      }
    }

    if (isPressed) {
      result.backgroundColor = pressedBgColor;
    }

    if (isDisabled) {
      result.backgroundColor = disabledBgColor;
      result.color = disabledColor;
    }

    return result;
  }, [
    styling,
    incomingStyle,
    isHovered,
    isDisabled,
    isQuiet,
    variant,
    isPressed,
  ]);

  let variantClassName = 'BU_variant-secondary';
  switch (variant) {
    case 'primary': {
      variantClassName = 'BU_variant-primary';
      break;
    }
    case 'destructive': {
      variantClassName = 'BU_variant-destructive';
      break;
    }

    case 'secondary': {
      variantClassName = 'BU_variant-secondary';
      break;
    }

    default: {
      // hack to catch switch slipping
      let val: never = variant;
      throw new Error('Unknown variant type ' + val);
    }
  }

  return (
    <BaseButton
      animateOnPress={animateOnPress}
      disabled={isDisabled}
      style={style}
      isHovered={isHovered}
      isPressed={isPressed}
      className={cx(
        'B-ui-components_button select-none',
        isTouchDevice ? 'py-2 px-4' : 'py-1 px-3',
        isFocusVisible && 'B-ui-components_misc-button-ring',
        variantClassName,
        className,
      )}
      ref={ref}
      {...mergeProps(hoverProps, buttonProps, focusProps)}
    >
      {children}
    </BaseButton>
  );
};
