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

export type ButtonTone = Exclude<Tone, Tone.Secondary>;

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
      color: vars.color.foreground.primaryInverted,
      buttonBgColor: vars.color.background.caution,
      hoverBgColor: vars.color.background.cautionHover,
      hoverColor: vars.color.foreground.primaryInverted,
      pressedBgColor: vars.color.background.cautionActive,
      disabledBgColor: vars.color.background.neutralLight,
      disabledColor: vars.color.background.neutralActive,
    },
    [Tone.Critical]: {
      color: vars.color.foreground.primaryInverted,
      buttonBgColor: vars.color.background.critical,
      hoverBgColor: vars.color.background.criticalHover,
      hoverColor: vars.color.foreground.primaryInverted,
      pressedBgColor: vars.color.background.criticalActive,
      disabledBgColor: vars.color.background.neutralLight,
      disabledColor: vars.color.background.neutralActive,
    },
    [Tone.Info]: {
      color: vars.color.foreground.primaryInverted,
      buttonBgColor: vars.color.background.info,
      hoverBgColor: vars.color.background.infoHover,
      hoverColor: vars.color.foreground.primaryInverted,
      pressedBgColor: vars.color.background.infoActive,
      disabledBgColor: vars.color.background.neutralLight,
      disabledColor: vars.color.background.neutralActive,
    },
    [Tone.Neutral]: {
      color: vars.color.foreground.neutral,
      buttonBgColor: vars.color.background.neutral,
      hoverBgColor: vars.color.background.neutralHover,
      hoverColor: vars.color.foreground.neutral,
      pressedBgColor: vars.color.background.neutralActive,
      disabledBgColor: vars.color.background.neutralLight,
      disabledColor: vars.color.background.neutralActive,
    },
    [Tone.Positive]: {
      color: vars.color.foreground.primaryInverted,
      buttonBgColor: vars.color.background.positive,
      hoverBgColor: vars.color.background.positiveHover,
      hoverColor: vars.color.foreground.primaryInverted,
      pressedBgColor: vars.color.background.positiveActive,
      disabledBgColor: vars.color.background.neutralLight,
      disabledColor: vars.color.background.neutralActive,
    },
    [Tone.Promote]: {
      color: vars.color.foreground.primaryInverted,
      buttonBgColor: vars.color.background.promote,
      hoverBgColor: vars.color.background.promoteHover,
      hoverColor: vars.color.foreground.primaryInverted,
      pressedBgColor: vars.color.background.promoteActive,
      disabledBgColor: vars.color.background.neutralLight,
      disabledColor: vars.color.background.neutralActive,
    },
  },

  [ButtonVariant.Ghost]: {
    [Tone.Caution]: {
      color: vars.color.foreground.caution,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.background.surfaceDark,
      hoverColor: vars.color.foreground.caution,
      pressedBgColor: vars.color.background.surfaceDark,
      disabledBgColor: vars.color.background.neutralLight,
      disabledColor: vars.color.background.neutralActive,
    },
    [Tone.Critical]: {
      color: vars.color.foreground.critical,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.background.surfaceDark,
      hoverColor: vars.color.foreground.critical,
      pressedBgColor: vars.color.background.surfaceDark,
      disabledBgColor: vars.color.background.neutralLight,
      disabledColor: vars.color.background.neutralActive,
    },
    [Tone.Info]: {
      color: vars.color.foreground.info,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.background.surfaceDark,
      hoverColor: vars.color.foreground.info,
      pressedBgColor: vars.color.background.surfaceDark,
      disabledBgColor: vars.color.background.neutralLight,
      disabledColor: vars.color.background.neutralActive,
    },
    [Tone.Neutral]: {
      color: vars.color.foreground.neutralLight,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.background.surfaceDark,
      hoverColor: vars.color.foreground.neutral,
      pressedBgColor: vars.color.background.surfaceDark,
      disabledBgColor: vars.color.background.neutralLight,
      disabledColor: vars.color.background.neutralActive,
    },
    [Tone.Positive]: {
      color: vars.color.foreground.positive,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.background.surfaceDark,
      hoverColor: vars.color.foreground.positive,
      pressedBgColor: vars.color.background.surfaceDark,
      disabledBgColor: vars.color.background.neutralLight,
      disabledColor: vars.color.background.neutralActive,
    },

    [Tone.Promote]: {
      color: vars.color.foreground.promote,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.background.surfaceDark,
      hoverColor: vars.color.foreground.promote,
      pressedBgColor: vars.color.background.surfaceDark,
      disabledBgColor: vars.color.background.neutralLight,
      disabledColor: vars.color.background.neutralActive,
    },
  },

  [ButtonVariant.Soft]: {
    [Tone.Caution]: {
      color: vars.color.foreground.caution,
      buttonBgColor: vars.color.background.surfaceDark,
      hoverBgColor: vars.color.background.surfaceDarker,
      hoverColor: vars.color.foreground.cautionLight,
      pressedBgColor: vars.color.background.surfaceDarker,
      disabledBgColor: vars.color.background.neutralLight,
      disabledColor: vars.color.background.neutralActive,
    },
    [Tone.Critical]: {
      color: vars.color.foreground.critical,
      buttonBgColor: vars.color.background.surfaceDark,
      hoverBgColor: vars.color.background.surfaceDarker,
      hoverColor: vars.color.foreground.criticalLight,
      pressedBgColor: vars.color.background.surfaceDarker,
      disabledBgColor: vars.color.background.neutralLight,
      disabledColor: vars.color.background.neutralActive,
    },
    [Tone.Info]: {
      color: vars.color.foreground.info,
      buttonBgColor: vars.color.background.surfaceDark,
      hoverBgColor: vars.color.background.surfaceDarker,
      hoverColor: vars.color.foreground.infoLight,
      pressedBgColor: vars.color.background.surfaceDarker,
      disabledBgColor: vars.color.background.neutralLight,
      disabledColor: vars.color.background.neutralActive,
    },
    [Tone.Neutral]: {
      color: vars.color.foreground.neutral,
      buttonBgColor: vars.color.background.surfaceDark,
      hoverBgColor: vars.color.background.surfaceDarker,
      hoverColor: vars.color.foreground.neutralLight,
      pressedBgColor: vars.color.background.surfaceDarker,
      disabledBgColor: vars.color.background.neutralLight,
      disabledColor: vars.color.background.neutralActive,
    },
    [Tone.Positive]: {
      color: vars.color.foreground.positive,
      buttonBgColor: vars.color.background.surfaceDark,
      hoverBgColor: vars.color.background.surfaceDarker,
      hoverColor: vars.color.foreground.positiveLight,
      pressedBgColor: vars.color.background.surfaceDarker,
      disabledBgColor: vars.color.background.neutralLight,
      disabledColor: vars.color.background.neutralActive,
    },
    [Tone.Promote]: {
      color: vars.color.foreground.promote,
      buttonBgColor: vars.color.background.surfaceDark,
      hoverBgColor: vars.color.background.surfaceDarker,
      hoverColor: vars.color.foreground.promoteLight,
      pressedBgColor: vars.color.background.surfaceDarker,
      disabledBgColor: vars.color.background.neutralLight,
      disabledColor: vars.color.background.neutralActive,
    },
  },

  [ButtonVariant.Transparent]: {
    [Tone.Caution]: {
      color: vars.color.foreground.caution,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.background.surfaceDarker,
      hoverColor: vars.color.foreground.caution,
      pressedBgColor: vars.color.background.surfaceDark,
      disabledBgColor: vars.color.background.neutralLight,
      disabledColor: vars.color.background.neutralActive,
    },
    [Tone.Critical]: {
      color: vars.color.foreground.critical,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.background.surfaceDarker,
      hoverColor: vars.color.foreground.critical,
      pressedBgColor: vars.color.background.surfaceDark,
      disabledBgColor: vars.color.background.neutralLight,
      disabledColor: vars.color.background.neutralActive,
    },
    [Tone.Info]: {
      color: vars.color.foreground.info,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.background.surfaceDarker,
      hoverColor: vars.color.foreground.info,
      pressedBgColor: vars.color.background.surfaceDark,
      disabledBgColor: vars.color.background.neutralLight,
      disabledColor: vars.color.background.neutralActive,
    },
    [Tone.Neutral]: {
      color: vars.color.foreground.neutral,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.background.surfaceDarker,
      hoverColor: vars.color.foreground.neutral,
      pressedBgColor: vars.color.background.surfaceDark,
      disabledBgColor: vars.color.background.neutralLight,
      disabledColor: vars.color.background.neutralActive,
    },
    [Tone.Positive]: {
      color: vars.color.foreground.positive,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.background.surfaceDarker,
      hoverColor: vars.color.foreground.positive,
      pressedBgColor: vars.color.background.surfaceDark,
      disabledBgColor: vars.color.background.neutralLight,
      disabledColor: vars.color.background.neutralActive,
    },
    [Tone.Promote]: {
      color: vars.color.foreground.promote,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.background.surfaceDarker,
      hoverColor: vars.color.foreground.promote,
      pressedBgColor: vars.color.background.surfaceDark,
      disabledBgColor: vars.color.background.neutralLight,
      disabledColor: vars.color.background.neutralActive,
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
