import React, { ReactNode } from 'react';

import { cx } from '@bangle.io/utils';

export function ButtonContent({
  text,
  icon,
  iconPos = 'left',
  size = 'medium',
  textClassName,
}: {
  icon?: React.ReactElement<{ className?: string }>;
  text?: string | ReactNode;
  iconPos?: 'left' | 'right';
  size?: 'small' | 'medium' | 'custom';
  textClassName?: string;
}) {
  const hasText = Boolean(text);
  const hasIcon = Boolean(icon);
  let iconSize = '';

  if (size === 'small') {
    iconSize = 'w-4 h-4';
  } else if (size === 'medium') {
    iconSize = 'w-5 h-5';
  }

  const isLeft = iconPos === 'left';
  const isRight = iconPos === 'right';
  const iconComp =
    icon &&
    React.isValidElement(icon) &&
    React.cloneElement(icon, {
      className: cx(
        icon.props.className,
        hasText && 'BU_has-text',

        hasText && isLeft && 'ml-1',
        hasText && isRight && 'mr-1',
        iconSize,
      ),
    });

  return (
    <>
      {iconPos === 'left' && iconComp}
      {text && (
        <span className={cx(textClassName, hasIcon && 'BU_has-icon')}>
          {text}
        </span>
      )}
      {iconPos === 'right' && iconComp}
    </>
  );
}
