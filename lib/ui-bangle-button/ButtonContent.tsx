import React, { ReactNode } from 'react';

import { cx } from '@bangle.io/utils';

export function ButtonContent({
  text,
  icon,
  size = 'medium',
}: {
  icon?: React.ReactElement<{ className?: string }>;
  text?: string | ReactNode;
  size?: 'small' | 'medium' | 'custom';
}) {
  const hasText = Boolean(text);
  const hasIcon = Boolean(icon);
  let iconSize = '';
  if (size === 'small') {
    iconSize = 'w-4 h-4';
  } else if (size === 'medium') {
    iconSize = 'w-5 h-5';
  }

  return (
    <>
      {icon &&
        React.isValidElement(icon) &&
        React.cloneElement(icon, {
          className: cx(icon.props.className, hasText && 'has-text', iconSize),
        })}
      {text && <span className={cx(hasIcon && 'has-icon')}>{text}</span>}
    </>
  );
}
