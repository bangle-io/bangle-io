import { cx } from '@bangle.io/base-utils';
import React from 'react';

export interface ContentSectionProps {
  children: React.ReactNode;
  className?: string;
  hasPadding?: boolean;
}

/** A section component that centers its content and applies optional padding. */
export function ContentSection({
  children,
  className,
  hasPadding = false,
}: ContentSectionProps) {
  return (
    <section
      className={cx(
        hasPadding && 'p-8',
        'flex flex-col items-center justify-center gap-4 text-center ',
        className,
      )}
    >
      <div className="mx-auto flex w-full flex-col gap-2">{children}</div>
    </section>
  );
}
