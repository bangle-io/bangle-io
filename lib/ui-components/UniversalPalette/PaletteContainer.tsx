import PropTypes from 'prop-types';
import React, { useRef } from 'react';

import { cx, useWatchClickOutside } from '@bangle.io/utils';

export function PaletteContainer({
  paletteType,
  onClickOutside,
  onClickInside,
  children,
  widescreen,
  className = '',
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

PaletteContainer.propTypes = {
  paletteType: PropTypes.string.isRequired,
  onClickOutside: PropTypes.func.isRequired,
  onClickInside: PropTypes.func.isRequired,
  widescreen: PropTypes.bool.isRequired,
};
