import { cx } from '@bangle.io/base-utils';
import React from 'react';

export interface SectionProps {
  children: React.ReactNode;
  className?: string;
  hasPadding?: boolean;
}

export function Section({
  children,
  className,
  hasPadding = false,
}: SectionProps) {
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
