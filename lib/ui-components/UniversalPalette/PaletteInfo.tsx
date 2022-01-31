import React from 'react';

import { cx } from '@bangle.io/utils';

export function PaletteInfo({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('flex flex-row justify-center my-1 space', className)}>
      {children}
    </div>
  );
}

export function PaletteInfoItem({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cx('text-xs ml-2 mr-2 font-light', className)}>
      {children}
    </span>
  );
}
