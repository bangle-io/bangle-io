import React from 'react';
import { cx } from 'utils/utility';

export function TextButton({
  className,
  children,
  hint,
  hintPos = 'bottom',
  onClick,
}) {
  return (
    <button
      type="button"
      className={cx(
        className,
        'text-button',
        'py-1 px-2 border border-transparent rounded-sm focus:ring-1 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-900 focus:outline-none transition-colors duration-200',
      )}
      aria-label={hint}
      data-bangle-editor-pos={hintPos}
      data-bangle-editor-break={true}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
