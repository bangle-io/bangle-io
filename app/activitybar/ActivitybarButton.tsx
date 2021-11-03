import React, { ReactNode } from 'react';

import { ButtonIcon } from '@bangle.io/ui-components';
import { cx } from '@bangle.io/utils';

export function ActivitybarButton({
  widescreen,
  hint,
  active,
  onActivate,
  icon,
}: {
  widescreen: boolean;
  hint?: string;
  active?: boolean;
  onActivate: () => void;
  icon: ReactNode;
}) {
  return (
    <ButtonIcon
      hint={hint}
      hintPos="right"
      active={active}
      className={cx(
        'flex justify-center pt-3 pb-3 mt-1 mb-1 transition-colors duration-200',
        widescreen && 'border-l-2',
      )}
      style={{
        borderColor: active ? 'var(--accent-stronger-color)' : 'transparent',
      }}
      onClick={(event) => {
        event.preventDefault();
        onActivate();
      }}
    >
      {icon}
    </ButtonIcon>
  );
}
