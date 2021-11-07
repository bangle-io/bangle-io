import React, { ReactNode } from 'react';

import { cx } from '@bangle.io/utils';

/**
 * A helper for laying content that takes full height and width available
 * and expects the content to be centered and read like a page
 *
 */
export function Page({
  children,
  className,
  childClassName,
  verticallyCenter = false,
  showBoxAround = false,
}: {
  children: ReactNode;
  className?: string;
  childClassName?: string;
  verticallyCenter?: boolean;
  showBoxAround?: boolean;
}) {
  return (
    <div
      className={cx(
        'w-full h-full flex flex-col items-center',
        className,
        verticallyCenter && 'justify-center',
      )}
      style={{
        padding: 'var(--window-page-padding)',
      }}
    >
      <div
        className={cx(
          'w-full',
          childClassName,
          showBoxAround && 'rounded-md b-bg-stronger-color ',
        )}
        style={{
          maxWidth: 'min(var(--page-maxWidth), 100vw)',
          padding: showBoxAround ? 'var(--window-page-box-padding)' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
