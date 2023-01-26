import React from 'react';

import type { Tone } from '@bangle.io/constants';
import { cx } from '@bangle.io/utils';

import type { BtnSize, ButtonVariant } from './common';
import { BtnIcon, createStyleObj, variantMapping } from './common';

type BaseButtonProps = {
  elementProps: Omit<React.HTMLProps<HTMLButtonElement>, 'className' | 'style'>;
  leftIcon: React.ReactNode;
  rightIcon: React.ReactNode;
  styleProps: BaseButtonStyleProps;
  text: React.ReactNode;
  textElementProps?: React.HTMLProps<HTMLSpanElement>;
};

export type BaseButtonStyleProps = {
  animateOnPress: boolean;
  className: string | undefined;
  isDisabled: boolean;
  isFocusVisible: boolean;
  isHovered: boolean;
  isPressed: boolean;
  isTouch: boolean;
  size: BtnSize;
  style: React.CSSProperties | undefined;
  onPressStyle?: React.CSSProperties;
  onHoverStyle?: React.CSSProperties;
  tone: Tone;
  variant: ButtonVariant;
  // auto will center if only one child is present
  // else it will space between
  justifyContent?: React.CSSProperties['justifyContent'] | 'auto';
};

export const useButtonStyleProps = ({
  text,
  textElementProps,
  leftIcon,
  rightIcon,
  styleProps,
  elementProps,
}: BaseButtonProps): React.HTMLProps<HTMLButtonElement> & {
  type: 'button';
} => {
  const [btnClass, btnStyle] = btnStyling(styleProps);

  const oneChild =
    (text && !leftIcon && !rightIcon) ||
    (!text && leftIcon && !rightIcon) ||
    (!text && !leftIcon && rightIcon);

  return {
    ...elementProps,
    type: (elementProps.type as any) ?? 'button',
    style: btnStyle,
    className: btnClass,
    children: (
      <span
        className={cx('flex flex-grow-1 overflow-hidden')}
        style={{
          justifyContent:
            styleProps.justifyContent !== 'auto' && styleProps.justifyContent
              ? styleProps.justifyContent
              : oneChild
              ? 'center'
              : 'space-between',
        }}
      >
        {leftIcon && (
          <span>
            <BtnIcon
              text={text}
              size={styleProps.size}
              side="left"
              icon={leftIcon}
            />
          </span>
        )}
        {text && (
          <span
            {...textElementProps}
            className={cx(
              'text-ellipsis overflow-hidden',
              textElementProps?.className,
            )}
          >
            {text}
          </span>
        )}
        {rightIcon && (
          <span>
            <BtnIcon
              text={text}
              size={styleProps.size}
              side="right"
              icon={rightIcon}
            />
          </span>
        )}
      </span>
    ),
  };
};

function btnStyling({
  animateOnPress,
  className: classNameProp,
  isDisabled,
  isFocusVisible,
  isHovered,
  isPressed,
  isTouch,
  size,
  style,
  tone,
  variant,
  onHoverStyle,
  onPressStyle,
}: BaseButtonStyleProps): [string, React.CSSProperties] {
  let className = classNameProp;

  switch (size) {
    case 'xs': {
      className = cx(
        className,
        'text-xs font-600 min-w-6',
        isTouch ? 'h-7 px-3' : 'h-6 px-1_5',
      );

      break;
    }
    case 'sm': {
      className = cx(
        className,
        'text-sm font-600 h-8 min-w-8',
        isTouch ? ' px-3' : 'px-2',
      );
      break;
    }
    case 'md': {
      className = cx(
        className,
        'text-base h-9 smallscreen:h-10 min-w-10',
        isTouch ? 'px-4' : 'px-3',
      );

      break;
    }
    case 'lg': {
      className = cx(
        className,
        'text-lg font-600 h-11 min-w-12',
        isTouch ? 'px-4' : 'px-4',
      );

      break;
    }
    default: {
      let x: never = size;
      throw new Error('Invalid size ' + x);
    }
  }

  className = cx(
    className,
    'select-none inline-flex justify-center items-center rounded-md whitespace-nowrap overflow-hidden',
    isTouch ? 'py-2' : 'py-1',
    isFocusVisible && 'ring-promote',
    animateOnPress
      ? 'transition-all duration-100'
      : 'transition-colors duration-100',
    animateOnPress && isPressed && (isTouch ? 'scale-94' : 'scale-97'),
    isDisabled ? 'cursor-not-allowed ' : 'cursor-pointer',
  );

  let variantStyle = variantMapping[variant][tone];

  let override = style;

  if (onHoverStyle && isHovered) {
    override = { ...override, ...onHoverStyle };
  }

  if (onPressStyle && isPressed) {
    override = { ...override, ...onPressStyle };
  }

  return [
    className,
    createStyleObj(variantStyle, override, {
      isDisabled,
      isHovered,
      isPressed,
      variant,
    }),
  ];
}
