import { useButton } from '@react-aria/button';
import { useFocusRing } from '@react-aria/focus';
import { useHover } from '@react-aria/interactions';
import { mergeProps } from '@react-aria/utils';
import React, { useRef } from 'react';

import { vars } from '@bangle.io/atomic-css';
import type { Tone } from '@bangle.io/constants';
import { TONE } from '@bangle.io/constants';
import type { FirstParameter } from '@bangle.io/shared-types';
import { cx, isTouchDevice } from '@bangle.io/utils';

export const BUTTON_VARIANT = {
  SOLID: 'solid',
  GHOST: 'ghost',
  SOFT: 'soft',
  TRANSPARENT: 'transparent',
} as const;

export type ButtonVariant = typeof BUTTON_VARIANT[keyof typeof BUTTON_VARIANT];

export function ButtonV2({
  animateOnPress = true,
  ariaLabel,
  className = '',
  focus = defaultFocus,
  isDisabled,
  isTouch = isTouchDevice,
  leftIcon,
  onPress,
  rightIcon,
  size = 'md',
  text,
  tone = TONE.NEUTRAL,
  variant = BUTTON_VARIANT.SOLID,
}: {
  animateOnPress?: boolean;
  ariaLabel?: string;
  autoFocus?: boolean;
  className?: string;
  focus?: FocusType;
  isDisabled?: boolean;
  isTouch?: boolean;
  leftIcon?: React.ReactNode;
  onPress?: FirstParameter<typeof useButton>['onPress'];
  rightIcon?: React.ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  text?: string;
  tone?: Tone;
  variant?: ButtonVariant;
}) {
  let ref = useRef<HTMLButtonElement>(null);

  const { hoverProps, isHovered } = useHover({ isDisabled });
  let { isFocusVisible, focusProps } = useFocusRing({
    autoFocus: focus?.autoFocus,
  });

  let variantStyle = variantMapping[variant][tone];

  const { buttonProps, isPressed } = useButton(
    {
      'aria-label': ariaLabel,
      onPress,
      isDisabled,
      'type': 'button',
      'autoFocus': focus?.autoFocus,
    },
    ref,
  );

  let leftIconClassName = '';
  let rightIconClassName = '';

  switch (size) {
    case 'xs': {
      className = cx(
        className,
        'text-xs font-600 min-w-6',
        isTouch ? 'h-7 px-3' : 'h-6 px-1_5',
      );

      leftIconClassName = cx(leftIconClassName, 'w-4 h-4', text && 'mr-0_5');
      rightIconClassName = cx(rightIconClassName, 'w-4 h-4', text && 'ml-0_5');
      break;
    }
    case 'sm': {
      className = cx(
        className,
        'text-sm font-600 h-8 min-w-8',
        isTouch ? ' px-3' : 'px-2',
      );
      leftIconClassName = cx(leftIconClassName, 'w-5 h-5', text && 'mr-1');
      rightIconClassName = cx(rightIconClassName, 'w-5 h-5', text && 'ml-1');
      break;
    }
    case 'md': {
      className = cx(
        className,
        'text-md h-10  min-w-10',
        isTouch ? 'px-3' : 'px-2',
      );
      leftIconClassName = cx(leftIconClassName, 'w-6 h-6', text && 'mr-1');
      rightIconClassName = cx(rightIconClassName, 'w-6 h-6', text && 'ml-1');

      break;
    }
    case 'lg': {
      className = cx(
        className,
        'text-lg font-600 h-12 min-w-12',
        isTouch ? 'px-4' : 'px-3',
      );
      leftIconClassName = cx(leftIconClassName, 'w-7 h-7', text && 'mr-1');
      rightIconClassName = cx(rightIconClassName, 'w-7 h-7', text && 'ml-1');

      break;
    }
    default: {
      let x: never = size;
      throw new Error('Invalid size');
    }
  }

  const leftIconComp =
    leftIcon &&
    React.isValidElement(leftIcon) &&
    React.cloneElement(leftIcon, {
      className: cx(leftIcon.props.className, leftIconClassName),
    } as any);

  const rightIconComp =
    rightIcon &&
    React.isValidElement(rightIcon) &&
    React.cloneElement(rightIcon, {
      className: cx(rightIcon.props.className, rightIconClassName),
    } as any);

  return (
    <button
      {...mergeProps(hoverProps, buttonProps, focusProps)}
      type="button"
      ref={ref}
      style={createStyleObj(variantStyle, {
        isHovered,
        isPressed,
        isDisabled,
        variant,
      })}
      className={cx(
        className,
        'select-none inline-flex justify-center items-center rounded-md',
        isTouch ? 'py-2' : 'py-1',
        isFocusVisible &&
          focus?.allowFocusRing &&
          'ring-2 ring-colorPromoteBorder ring-offset-2 ring-offset-colorNeutralTextInverted',
        animateOnPress
          ? 'transition-all duration-100'
          : 'transition-colors duration-100',
        animateOnPress && isPressed && (isTouch ? 'scale-94' : 'scale-97'),
        isDisabled ? 'cursor-not-allowed ' : 'cursor-pointer',
      )}
    >
      {leftIconComp && <span>{leftIconComp}</span>}
      {text}
      {rightIconComp && <span>{rightIconComp}</span>}
    </button>
  );
}

interface FocusType {
  allowFocusRing?: boolean;
  autoFocus?: boolean;
  // TODO add focus ring offset color
}

const defaultFocus: FocusType = {
  allowFocusRing: true,
  autoFocus: false,
};

interface ButtonStyles {
  color: string;
  buttonBgColor: string;
  hoverBgColor: string;
  hoverColor: string;
  pressedBgColor: string;
  disabledBgColor: string;
  disabledColor: string;
}

const variantMapping: Record<ButtonVariant, Record<Tone, ButtonStyles>> = {
  [BUTTON_VARIANT.SOLID]: {
    [TONE.CAUTION]: {
      color: vars.color.caution.solidText,
      buttonBgColor: vars.color.caution.solid,
      hoverBgColor: vars.color.caution.solidStrong,
      hoverColor: vars.color.caution.solidText,
      pressedBgColor: vars.color.caution.solidStronger,
      disabledBgColor: vars.color.caution.solidFaint,
      disabledColor: vars.color.neutral.textDisabled,
    },
    [TONE.CRITICAL]: {
      color: vars.color.critical.solidText,
      buttonBgColor: vars.color.critical.solid,
      hoverBgColor: vars.color.critical.solidStrong,
      hoverColor: vars.color.critical.solidText,
      pressedBgColor: vars.color.critical.solidStronger,
      disabledBgColor: vars.color.critical.solidFaint,
      disabledColor: vars.color.neutral.textDisabled,
    },

    [TONE.NEUTRAL]: {
      color: vars.color.neutral.solidText,
      buttonBgColor: vars.color.neutral.solid,
      hoverBgColor: vars.color.neutral.solidStrong,
      hoverColor: vars.color.neutral.solidText,
      pressedBgColor: vars.color.neutral.solidStronger,
      disabledBgColor: vars.color.neutral.solidFaint,
      disabledColor: vars.color.neutral.textDisabled,
    },
    [TONE.SECONDARY]: {
      color: vars.color.secondary.solidText,
      buttonBgColor: vars.color.secondary.solid,
      hoverBgColor: vars.color.secondary.solidStrong,
      hoverColor: vars.color.secondary.solidText,
      pressedBgColor: vars.color.secondary.solidStronger,
      disabledBgColor: vars.color.secondary.solidFaint,
      disabledColor: vars.color.neutral.textDisabled,
    },
    [TONE.POSITIVE]: {
      color: vars.color.positive.solidText,
      buttonBgColor: vars.color.positive.solid,
      hoverBgColor: vars.color.positive.solidStrong,
      hoverColor: vars.color.positive.solidText,
      pressedBgColor: vars.color.positive.solidStronger,
      disabledBgColor: vars.color.positive.solidFaint,
      disabledColor: vars.color.neutral.textDisabled,
    },
    [TONE.PROMOTE]: {
      color: vars.color.promote.solidText,
      buttonBgColor: vars.color.promote.solid,
      hoverBgColor: vars.color.promote.solidStrong,
      hoverColor: vars.color.promote.solidText,
      pressedBgColor: vars.color.promote.solidStronger,
      disabledBgColor: vars.color.promote.solidFaint,
      disabledColor: vars.color.neutral.textDisabled,
    },
  },

  [BUTTON_VARIANT.GHOST]: {
    [TONE.CAUTION]: {
      color: vars.color.caution.solid,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.solidFaint,
      hoverColor: vars.color.caution.solidStrong,
      pressedBgColor: vars.color.neutral.border,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
    [TONE.CRITICAL]: {
      color: vars.color.critical.solid,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.solidFaint,
      hoverColor: vars.color.critical.solidStrong,
      pressedBgColor: vars.color.neutral.border,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },

    [TONE.NEUTRAL]: {
      color: vars.color.neutral.text,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.solidFaint,
      hoverColor: vars.color.neutral.solidText,
      pressedBgColor: vars.color.neutral.border,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
    [TONE.SECONDARY]: {
      color: vars.color.secondary.solidText,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.solidFaint,
      hoverColor: vars.color.secondary.solidText,
      pressedBgColor: vars.color.neutral.border,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },

    [TONE.POSITIVE]: {
      color: vars.color.positive.solid,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.solidFaint,
      hoverColor: vars.color.positive.solidStrong,
      pressedBgColor: vars.color.neutral.border,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },

    [TONE.PROMOTE]: {
      color: vars.color.promote.solid,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.solidFaint,
      hoverColor: vars.color.promote.solidStrong,
      pressedBgColor: vars.color.neutral.border,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
  },

  [BUTTON_VARIANT.SOFT]: {
    [TONE.CAUTION]: {
      color: vars.color.caution.solid,
      buttonBgColor: vars.color.neutral.borderSubdued,
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.caution.solid,
      pressedBgColor: vars.color.neutral.borderStrong,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
    [TONE.CRITICAL]: {
      color: vars.color.critical.solid,
      buttonBgColor: vars.color.neutral.borderSubdued,
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.critical.solid,
      pressedBgColor: vars.color.neutral.borderStrong,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },

    [TONE.NEUTRAL]: {
      color: vars.color.neutral.text,
      buttonBgColor: vars.color.neutral.borderSubdued,
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.neutral.text,
      pressedBgColor: vars.color.neutral.borderStrong,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
    [TONE.SECONDARY]: {
      color: vars.color.secondary.solidText,
      buttonBgColor: vars.color.neutral.borderSubdued,
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.neutral.text,
      pressedBgColor: vars.color.neutral.borderStrong,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
    [TONE.POSITIVE]: {
      color: vars.color.positive.solid,
      buttonBgColor: vars.color.neutral.borderSubdued,
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.positive.solid,
      pressedBgColor: vars.color.neutral.borderStrong,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
    [TONE.PROMOTE]: {
      color: vars.color.promote.solid,
      buttonBgColor: vars.color.neutral.borderSubdued,
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.promote.solid,
      pressedBgColor: vars.color.neutral.borderStrong,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
  },

  [BUTTON_VARIANT.TRANSPARENT]: {
    [TONE.CAUTION]: {
      color: vars.color.caution.solid,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.caution.solidStrong,
      pressedBgColor: vars.color.neutral.borderStrong,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },

    [TONE.CRITICAL]: {
      color: vars.color.critical.solid,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.critical.solidStrong,
      pressedBgColor: vars.color.neutral.borderStrong,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },

    [TONE.NEUTRAL]: {
      color: vars.color.neutral.text,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.neutral.text,
      pressedBgColor: vars.color.neutral.borderStrong,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
    [TONE.SECONDARY]: {
      color: vars.color.neutral.text,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.neutral.text,
      pressedBgColor: vars.color.neutral.borderStrong,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },

    [TONE.POSITIVE]: {
      color: vars.color.positive.solid,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.positive.solidStrong,
      pressedBgColor: vars.color.neutral.borderStrong,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },

    [TONE.PROMOTE]: {
      color: vars.color.promote.solid,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.promote.solidStrong,
      pressedBgColor: vars.color.neutral.border,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
  },
};

function createStyleObj(
  buttonStyles: ButtonStyles,
  opts: {
    isHovered: boolean;
    isPressed: boolean;
    isDisabled?: boolean;
    variant: ButtonVariant;
  },
): React.CSSProperties {
  let style: React.CSSProperties = {};

  const isGhost = opts.variant === BUTTON_VARIANT.GHOST;

  const setBorder = (color: string) => {
    style.border = `2px solid ${color}`;
  };
  const setBgColor = (color: string) => {
    style.backgroundColor = color;
  };

  style.color = buttonStyles.color;

  if (isGhost) {
    setBorder(buttonStyles.color);

    if (opts.isDisabled) {
      setBorder(buttonStyles.disabledColor);
    }
  }

  setBgColor(buttonStyles.buttonBgColor);

  if (opts.isDisabled) {
    setBgColor(buttonStyles.disabledBgColor);
    style.color = buttonStyles.disabledColor;
  }

  if (opts.isHovered && !opts.isDisabled) {
    style.color = buttonStyles.hoverColor;
    setBgColor(buttonStyles.hoverBgColor);
  }

  if (opts.isPressed && !opts.isDisabled) {
    setBgColor(buttonStyles.pressedBgColor);
    isGhost && setBorder(buttonStyles.hoverColor);
  }

  return style;
}
