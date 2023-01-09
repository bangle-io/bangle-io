import React from 'react';

import { cx } from '@bangle.io/utils';

export function FieldLabel({
  label,
  labelProps,
}: {
  label: React.ReactNode;
  labelProps: React.HTMLProps<HTMLLabelElement>;
}) {
  return (
    <label
      {...labelProps}
      className={cx(
        'text-sm text-colorNeutralTextSubdued',
        labelProps.className,
      )}
    >
      {label}
    </label>
  );
}
