import PropTypes from 'prop-types';
import React, { useEffect, useRef } from 'react';
import { useWatchClickOutside } from 'utils/index';
// TODO move this to a common package

export function PaletteContainer({
  onClickOutside,
  onClickInside,
  children,
  widescreen,
}) {
  const containerRef = useRef();

  useWatchClickOutside(containerRef, onClickOutside, onClickInside);

  return (
    <div
      ref={containerRef}
      className={
        'universal-palette-container' + (widescreen ? ' widescreen' : '')
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
