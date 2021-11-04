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
        padding:
          'var(--page-top-padding) var(--page-x-axis-padding) var(--page-bottom-padding) var(--page-x-axis-padding)',
      }}
    >
      <div
        className={cx(
          'w-full ',
          childClassName,
          showBoxAround && 'rounded-md b-bg-stronger-color ',
        )}
        style={{
          maxWidth: 'min(var(--page-max-width), 100vw)',
          padding: 'var(--page-box-padding)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
