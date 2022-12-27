// inspired from https://seek-oss.github.io/braid-design-system/components/Inline

import React from 'react';

import { cx } from '@bangle.io/utils';

/**
 * A helper utility for showing multiple elements inline, and coverting them
 * to columns on small screens.
 * @param param0
 * @param param0.children
 * @param param0.collapse - if true, the children will converted to columns on small screens
 * @param param0.collapse - if true, the children will converted to columns on small screens
 * @param param0.reverseRow - if true, applies flex-row-reverse to the children on wide screens
 * @returns
 */
export function Inline({
  children,
  collapse = true,
  className,
  justify = 'start',
  reverseRow,
  gap = 2,
}: {
  children: React.ReactNode;
  collapse?: boolean;
  className?: string;
  justify?: 'center' | 'start' | 'end' | null;
  reverseRow?: boolean;
  gap?: 1 | 2 | 3 | 4;
}) {
  return (
    <div
      className={cx(
        className,
        'flex flex-wrap',
        collapse && 'smallscreen:flex-col',
        gap === 1
          ? 'gap-1'
          : gap === 2
          ? 'gap-2'
          : gap === 3
          ? 'gap-3'
          : 'gap-4',
        reverseRow ? 'flex-row-reverse' : 'flex-row',
        justify &&
          (justify === 'center'
            ? 'justify-center'
            : justify === 'start'
            ? 'justify-start'
            : 'justify-end'),
      )}
    >
      {children}
    </div>
  );
}
