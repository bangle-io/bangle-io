import React, { ReactNode } from 'react';

import { cx } from '@bangle.io/utils';

/**
 * A helper for showing non scrollable centered things that match the pages look
 */
export function CenteredBoxedPage({
  childClassName,
  children,
  className,
}: {
  childClassName?: string;
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  headerBgColor?: string;
  stickyHeader?: boolean;
  verticallyCenter?: boolean;
}) {
  return (
    <div
      className={cx(
        'w-full h-full flex flex-col px-8 mt-6 lg:p-0 lg:m-0 justify-center items-center',
        className,
      )}
    >
      <div
        className="w-full rounded-lg"
        style={{
          padding: 'var(--window-page-box-padding)',
          backgroundColor: 'var(--window-bgColor-1)',
          maxWidth: 'min(var(--page-maxWidth), 100vw)',
          border: '1px solid var(--window-borderColor-1)',
        }}
      >
        <div
          className={cx('w-full', childClassName)}
          style={{
            maxWidth: 'min(var(--page-maxWidth), 100vw)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
