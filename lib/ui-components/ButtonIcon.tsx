import React from 'react';

import { cx } from '@bangle.io/utils';

export function ButtonIcon({
  className = '',
  hint,
  hintPos = 'bottom',
  children,
  onClick,
  active,
  style,
  removeFocus = true,
}: {
  className?: string;
  hint?: string;
  hintPos?: string;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  active?: boolean;
  style?: React.CSSProperties;
  removeFocus?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={hint}
      data-bangle-editor-pos={hintPos}
      data-bangle-editor-break={true}
      className={cx(
        active && 'BU_active',
        removeFocus && 'focus:outline-none',
        className,
      )}
      onClick={onClick}
      style={style}
    >
      {children}
    </button>
  );
}
