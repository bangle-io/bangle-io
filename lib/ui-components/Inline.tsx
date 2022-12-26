// inspired from https://seek-oss.github.io/braid-design-system/components/Inline

import React from 'react';

import { cx } from '@bangle.io/utils';

/**
 * A helper utility for showing multiple elements inline, and coverting them
 * to columns on small screens.
 * @param param0
 * @param param0.children
 * @param param0.collapse - if true, the children will converted to columns on small screens
 * @returns
 */
export function Inline({
  children,
  collapse = false,
  className,
}: {
  children: React.ReactNode;
  collapse?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cx(
        className,
        'flex flex-row flex-wrap gap-2',
        collapse ? 'smallscreen:flex-col' : 'justify-center',
      )}
    >
      {children}
    </div>
  );
}
