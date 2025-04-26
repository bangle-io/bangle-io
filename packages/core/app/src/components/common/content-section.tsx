import { cx } from '@bangle.io/base-utils';
import React from 'react';

export interface ContentSectionProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Apply standard padding (p-8).
   * @default false
   */
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
        'flex flex-col items-center justify-center gap-4 text-center',
        hasPadding && 'p-8',
        className,
      )}
    >
      {children}
    </section>
  );
}
