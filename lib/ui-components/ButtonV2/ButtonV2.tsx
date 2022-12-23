import { useButton } from '@react-aria/button';
import { useFocusRing } from '@react-aria/focus';
import { useHover } from '@react-aria/interactions';
import { mergeProps } from '@react-aria/utils';
import React, { useRef } from 'react';

import { vars } from '@bangle.io/atomic-css';
import { Tone } from '@bangle.io/constants';
import type { FirstParameter } from '@bangle.io/shared-types';
import { cx, isTouchDevice } from '@bangle.io/utils';

export enum ButtonVariant {
  Solid = 'solid',
  Ghost = 'ghost',
  Soft = 'soft',
  Transparent = 'transparent',
}

export type ButtonTone = Tone;

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
  tone = Tone.Neutral,
  variant = ButtonVariant.Solid,
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
  tone?: ButtonTone;
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
        'select-none inline-flex justify-center items-center rounded-md ',
        isTouch ? 'py-2' : 'py-1',
        isFocusVisible &&
          focus?.allowFocusRing &&
          'ring-2 ring-bgBrandAccent ring-offset-3 ring-offset-bgSurface',
        animateOnPress
          ? 'transition-all duration-100'
          : 'transition-colors duration-100',
        animateOnPress && isPressed ? (isTouch ? 'scale-94' : 'scale-97') : '',
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

const variantMapping: Record<
  ButtonVariant,
  Record<ButtonTone, ButtonStyles>
> = {
  [ButtonVariant.Solid]: {
    [Tone.Caution]: {
      color: vars.color.neutral.textInverted,
      buttonBgColor: vars.color.caution.btn,
      hoverBgColor: vars.color.caution.btnHover,
      hoverColor: vars.color.neutral.textInverted,
      pressedBgColor: vars.color.caution.btnDown,
      disabledBgColor: vars.color.caution.btnDisabled,
      disabledColor: vars.color.neutral.textDisabled,
    },
    [Tone.Critical]: {
      color: vars.color.neutral.textInverted,
      buttonBgColor: vars.color.critical.btn,
      hoverBgColor: vars.color.critical.btnHover,
      hoverColor: vars.color.neutral.textInverted,
      pressedBgColor: vars.color.critical.btnDown,
      disabledBgColor: vars.color.critical.btnDisabled,
      disabledColor: vars.color.neutral.textDisabled,
    },
    [Tone.Info]: {
      color: vars.color.neutral.textInverted,
      buttonBgColor: vars.color.info.btn,
      hoverBgColor: vars.color.info.btnHover,
      hoverColor: vars.color.neutral.textInverted,
      pressedBgColor: vars.color.info.btnDown,
      disabledBgColor: vars.color.info.btnDisabled,
      disabledColor: vars.color.neutral.textDisabled,
    },
    [Tone.Neutral]: {
      color: vars.color.neutral.textInverted,
      buttonBgColor: vars.color.neutral.btn,
      hoverBgColor: vars.color.neutral.btnHover,
      hoverColor: vars.color.neutral.textInverted,
      pressedBgColor: vars.color.neutral.btnDown,
      disabledBgColor: vars.color.neutral.btnDisabled,
      disabledColor: vars.color.neutral.textDisabled,
    },
    [Tone.Positive]: {
      color: vars.color.neutral.textInverted,
      buttonBgColor: vars.color.positive.btn,
      hoverBgColor: vars.color.positive.btnHover,
      hoverColor: vars.color.neutral.textInverted,
      pressedBgColor: vars.color.positive.btnDown,
      disabledBgColor: vars.color.positive.btnDisabled,
      disabledColor: vars.color.neutral.textDisabled,
    },
    [Tone.Promote]: {
      color: vars.color.neutral.textInverted,
      buttonBgColor: vars.color.promote.btn,
      hoverBgColor: vars.color.promote.btnHover,
      hoverColor: vars.color.neutral.textInverted,
      pressedBgColor: vars.color.promote.btnDown,
      disabledBgColor: vars.color.promote.btnDisabled,
      disabledColor: vars.color.neutral.textDisabled,
    },
  },

  [ButtonVariant.Ghost]: {
    [Tone.Caution]: {
      color: vars.color.caution.btn,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.borderLight,
      hoverColor: vars.color.caution.btnHover,
      pressedBgColor: vars.color.neutral.border,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
    [Tone.Critical]: {
      color: vars.color.critical.btn,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.borderLight,
      hoverColor: vars.color.critical.btnHover,
      pressedBgColor: vars.color.neutral.border,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
    [Tone.Info]: {
      color: vars.color.info.btn,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.borderLight,
      hoverColor: vars.color.info.btnHover,
      pressedBgColor: vars.color.neutral.border,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
    [Tone.Neutral]: {
      color: vars.color.neutral.btn,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.borderLight,
      hoverColor: vars.color.neutral.btnHover,
      pressedBgColor: vars.color.neutral.border,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
    [Tone.Positive]: {
      color: vars.color.positive.btn,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.borderLight,
      hoverColor: vars.color.positive.btnHover,
      pressedBgColor: vars.color.neutral.border,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },

    [Tone.Promote]: {
      color: vars.color.promote.btn,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.borderLight,
      hoverColor: vars.color.promote.btnHover,
      pressedBgColor: vars.color.neutral.border,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
  },

  [ButtonVariant.Soft]: {
    [Tone.Caution]: {
      color: vars.color.caution.btn,
      buttonBgColor: vars.color.neutral.borderLight,
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.caution.btnHover,
      pressedBgColor: vars.color.caution.btnDown,
      disabledBgColor: vars.color.caution.btnDisabled,
      disabledColor: vars.color.neutral.textDisabled,
    },
    [Tone.Critical]: {
      color: vars.color.critical.btn,
      buttonBgColor: vars.color.neutral.borderLight,
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.critical.btnHover,
      pressedBgColor: vars.color.critical.btnDown,
      disabledBgColor: vars.color.critical.btnDisabled,
      disabledColor: vars.color.neutral.textDisabled,
    },
    [Tone.Info]: {
      color: vars.color.info.btn,
      buttonBgColor: vars.color.neutral.borderLight,
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.info.btnHover,
      pressedBgColor: vars.color.info.btnDown,
      disabledBgColor: vars.color.info.btnDisabled,
      disabledColor: vars.color.neutral.textDisabled,
    },
    [Tone.Neutral]: {
      color: vars.color.neutral.btn,
      buttonBgColor: vars.color.neutral.borderLight,
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.neutral.btnHover,
      pressedBgColor: vars.color.neutral.btnDown,
      disabledBgColor: vars.color.neutral.btnDisabled,
      disabledColor: vars.color.neutral.textDisabled,
    },
    [Tone.Positive]: {
      color: vars.color.positive.btn,
      buttonBgColor: vars.color.neutral.borderLight,
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.positive.btnHover,
      pressedBgColor: vars.color.positive.btnDown,
      disabledBgColor: vars.color.positive.btnDisabled,
      disabledColor: vars.color.neutral.textDisabled,
    },
    [Tone.Promote]: {
      color: vars.color.promote.btn,
      buttonBgColor: vars.color.neutral.borderLight,
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.promote.btnHover,
      pressedBgColor: vars.color.promote.btnDown,
      disabledBgColor: vars.color.promote.btnDisabled,
      disabledColor: vars.color.neutral.textDisabled,
    },
  },

  [ButtonVariant.Transparent]: {
    [Tone.Caution]: {
      color: vars.color.caution.btn,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.caution.btnHover,
      pressedBgColor: vars.color.caution.btnDown,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
    [Tone.Critical]: {
      color: vars.color.critical.btn,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.critical.btnHover,
      pressedBgColor: vars.color.critical.btnDown,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
    [Tone.Info]: {
      color: vars.color.info.btn,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.info.btnHover,
      pressedBgColor: vars.color.info.btnDown,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
    [Tone.Neutral]: {
      color: vars.color.neutral.btn,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.neutral.btnHover,
      pressedBgColor: vars.color.neutral.btnDown,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
    [Tone.Positive]: {
      color: vars.color.positive.btn,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.positive.btnHover,
      pressedBgColor: vars.color.positive.btnDown,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
    [Tone.Promote]: {
      color: vars.color.promote.btn,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.promote.btnHover,
      pressedBgColor: vars.color.promote.btnDown,
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

  const isGhost = opts.variant === ButtonVariant.Ghost;

  const setBorder = (color: string) => {
    style.border = `2px solid ${color}`;
  };
  const setBgColor = (color: string) => {
    style.backgroundColor = color;
  };

  style.color = buttonStyles.color;

  isGhost && setBorder(buttonStyles.color);

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
