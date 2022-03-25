import React, { ReactNode } from 'react';

import { cx } from '@bangle.io/utils';

/**
 * A helper for showing non scrollable centered things that match the pages look
 */
export function CenteredBoxedPage({
  childClassName,
  children,
  className,
  title,
  actions,
}: {
  childClassName?: string;
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  headerBgColor?: string;
  stickyHeader?: boolean;
  verticallyCenter?: boolean;
  title?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      className={cx(
        'ui-components_centered-page w-full h-full flex flex-col px-8 mt-6 lg:p-0 lg:m-0 justify-center items-center',
        className,
      )}
    >
      <div
        className="w-full rounded-lg"
        style={{
          padding: 'var(--window-page-box-padding)',
          backgroundColor: 'var(--window-bg-color-1)',
          maxWidth: 'min(var(--page-max-width), 100vw)',
          border: '1px solid var(--window-border-color-1)',
        }}
      >
        <div
          className={cx('w-full', childClassName)}
          style={{
            maxWidth: 'min(var(--page-max-width), 100vw)',
          }}
        >
          {title && (
            <h1 className="mb-6 text-base font-bold leading-none lg:text-xl">
              {title}
            </h1>
          )}
          <div className="text-base font-medium sm:mb-1">{children}</div>
          {actions && (
            <div className="flex flex-row mt-6 ui-components_centered-page-actions">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
