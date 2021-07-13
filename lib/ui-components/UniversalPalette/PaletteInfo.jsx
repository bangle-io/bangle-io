import React, { useEffect, useRef } from 'react';
import { cx } from 'utils';

export function PaletteInfo({ children, className = '' }) {
  return (
    <div className={cx('flex flex-row justify-center my-1 space', className)}>
      {children}
    </div>
  );
}

export function PaletteInfoItem({ children, className = '' }) {
  return (
    <span className={cx('text-xs mr-3 font-light', className)}>{children}</span>
  );
}
