import React from 'react';

import { cx } from '@bangle.io/utils';

type BaseButtonType = React.HTMLProps<HTMLButtonElement> & {
  animateOnPress?: boolean;
  children: React.ReactNode;
  isHovered: boolean;
  isPressed: boolean;
};

export const BaseButton = React.forwardRef<HTMLButtonElement, BaseButtonType>(
  (props, ref) => {
    let {
      animateOnPress,
      children,
      className,
      isHovered,
      isPressed,
      style,
      ...otherProps
    } = props;

    if (isPressed && animateOnPress) {
      style = {
        ...style,
        transform: 'scale(var(--BV-ui-bangle-button-depression))',
      };
    }

    return (
      <button
        {...otherProps}
        type="button"
        className={cx(
          className,
          'transition-all duration-100 cursor-default ',
          otherProps.disabled && 'cursor-not-allowed',
          isHovered && 'BU_is-hovered',
          isPressed && 'BU_is-pressed',
        )}
        style={style}
        ref={ref}
      >
        {children}
      </button>
    );
  },
);
