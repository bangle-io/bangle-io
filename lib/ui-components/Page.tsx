import React, { ReactNode } from 'react';

import { cx } from '@bangle.io/utils';

/**
 * A helper for laying content that takes full height and width available
 * and expects the content to be centered and read like a page
 *
 */
export function Page({
  widescreen,
  childClassName,
  children,
  className,
  header,
  headerBgColor = 'var(--window-bg-color-0)',
  stickyHeader,
}: {
  widescreen: boolean;
  childClassName?: string;
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  headerBgColor?: string;
  stickyHeader?: boolean;
  verticallyCenter?: boolean;
}) {
  return (
    <div className={cx('w-full h-full flex flex-col items-center', className)}>
      {header && (
        <div
          className={cx(
            'w-full px-2 py-1 lg:px-4',
            stickyHeader && 'sticky top-0 z-10',
          )}
          style={{
            backgroundColor: headerBgColor,
          }}
        >
          {header}
        </div>
      )}
      <div
        className={cx('w-full', childClassName)}
        style={{
          maxWidth: 'min(var(--page-max-width), 100vw)',
          padding: widescreen
            ? 'var(--window-page-padding)'
            : 'var(--window-page-mobile-padding)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
