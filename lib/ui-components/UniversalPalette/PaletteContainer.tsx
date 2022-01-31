import React, { useRef } from 'react';

import { cx, useWatchClickOutside } from '@bangle.io/utils';

export function PaletteContainer({
  paletteType,
  onClickOutside,
  onClickInside,
  children,
  widescreen,
  className = '',
}: {
  paletteType?: string | null;
  onClickOutside?: () => void;
  onClickInside?: () => void;
  children: React.ReactNode;
  widescreen?: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useWatchClickOutside(containerRef, onClickOutside, onClickInside);
  return (
    <div
      data-palette-type={paletteType}
      ref={containerRef}
      className={
        'universal-palette-container ' +
        cx(widescreen && ' widescreen', className)
      }
    >
      {children}
    </div>
  );
}
