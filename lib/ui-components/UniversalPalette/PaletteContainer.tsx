import PropTypes from 'prop-types';
import React, { useRef } from 'react';
import { cx, useWatchClickOutside } from 'utils';

export function PaletteContainer({
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
  onClickOutside: PropTypes.func.isRequired,
  onClickInside: PropTypes.func.isRequired,
  widescreen: PropTypes.bool.isRequired,
};
