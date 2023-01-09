import { useButton } from '@react-aria/button';
import { useFocusRing } from '@react-aria/focus';
import { useHover } from '@react-aria/interactions';
import { mergeProps } from '@react-aria/utils';
import React, { useRef } from 'react';

import type { Tone } from '@bangle.io/constants';
import { TONE } from '@bangle.io/constants';
import type { FirstParameter } from '@bangle.io/shared-types';
import { isTouchDevice } from '@bangle.io/utils';

import type { BtnSize, ButtonVariant } from './common';
import { BUTTON_VARIANT } from './common';
import { useButtonStyleProps } from './hooks';

interface FocusType {
  autoFocus?: boolean;
  // TODO add focus ring offset color
}

const defaultFocus = {
  autoFocus: false,
} satisfies FocusType;

export function ButtonV2({
  animateOnPress = true,
  ariaLabel,
  className = '',
  focus,
  id,
  isDisabled = false,
  isTouch = isTouchDevice,
  leftIcon,
  onPress,
  rightIcon,
  size = 'md',
  style = {},
  text,
  tone = TONE.NEUTRAL,
  tooltipPlacement,
  variant = BUTTON_VARIANT.SOLID,
}: {
  animateOnPress?: boolean;
  ariaLabel?: string;
  className?: string;
  focus?: FocusType;
  id?: string;
  isDisabled?: boolean;
  isTouch?: boolean;
  // do not fill in the set the width and height (w-X and h-X)
  // use size instead
  leftIcon?: React.ReactNode;
  onPress?: FirstParameter<typeof useButton>['onPress'];
  rightIcon?: React.ReactNode;
  size?: BtnSize;
  style?: React.CSSProperties;
  text?: React.ReactNode;
  tone?: Tone;
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right';
  variant?: ButtonVariant;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const { autoFocus = defaultFocus.autoFocus } = focus || defaultFocus;

  const { hoverProps, isHovered } = useHover({ isDisabled });

  const { isFocusVisible, focusProps } = useFocusRing({
    autoFocus: autoFocus,
  });

  const { buttonProps, isPressed } = useButton(
    {
      'aria-label': ariaLabel,
      onPress,
      isDisabled,
      'type': 'button',
      'autoFocus': autoFocus,
    },
    ref,
  );

  const elementProps = mergeProps(hoverProps, buttonProps, focusProps);

  return (
    <button
      ref={ref}
      {...useButtonStyleProps({
        elementProps,
        leftIcon,
        rightIcon,
        styleProps: {
          animateOnPress,
          className,
          isDisabled,
          isFocusVisible,
          isHovered,
          isPressed,
          isTouch,
          size,
          tone,
          style,
          variant,
        },
        text,
      })}
    />
  );
}
