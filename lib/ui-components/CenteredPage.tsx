import type { ReactNode } from 'react';
import React from 'react';

import { vars } from '@bangle.io/atomic-css';
import { cx } from '@bangle.io/utils';

import { Inline } from './Inline';

/**
 * A helper for showing non scrollable centered things that match the pages look
 */
export function CenteredBoxedPage({
  childClassName,
  children,
  className,
  title,
  actions,
  dataTestId,
}: {
  dataTestId?: string;
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
      data-testid={dataTestId}
      className={cx(
        'w-full h-full smallscreen:h-screen flex flex-col px-8 mt-6 lg:p-0 lg:m-0 justify-center smallscreen:justify-start items-center',
        className,
      )}
    >
      <div
        className="w-full rounded-lg border-neutral bg-colorNeutralBgLayerTop"
        style={{
          padding: vars.misc.pagePadding,
          maxWidth: `min(${vars.misc.pageMaxWidth}, 100vw)`,
        }}
      >
        <div
          className={cx('w-full', childClassName)}
          style={{
            maxWidth: `min(${vars.misc.pageMaxWidth}, 100vw)`,
          }}
        >
          {title && (
            <h1 className="mb-6 text-base font-bold leading-none smallscreen:text-lg text-xl">
              {title}
            </h1>
          )}
          <div className="text-base sm:mb-1">{children}</div>
          {actions && (
            <Inline collapse className="mt-6 ">
              {actions}
            </Inline>
          )}
        </div>
      </div>
    </div>
  );
}
