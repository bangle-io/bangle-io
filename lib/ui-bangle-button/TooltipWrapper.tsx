import React, { ReactNode } from 'react';

import { cx } from '@bangle.io/utils';

export function TooltipWrapper({
  wrapWords = false,
  children,
}: {
  wrapWords?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        'py-1 px-2 shadow-lg rounded-md ui-bangle-button_tooltip',
        wrapWords ? 'whitespace-normal' : 'whitespace-nowrap',
      )}
    >
      {children}
    </div>
  );
}
