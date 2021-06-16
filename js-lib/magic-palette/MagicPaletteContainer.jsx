import PropTypes from 'prop-types';
import React, { useCallback, useEffect, useState, useRef } from 'react';

// TODO move this to a common package
function useWatchClickOutside(ref, onClickOutside, onClickInside) {
  useEffect(() => {
    const handler = (e) => {
      if (!ref.current) {
        return;
      }
      if (ref.current.contains(e.target)) {
        onClickInside();
        return;
      }
      onClickOutside();
      return;
    };
    document.addEventListener('click', handler);
    return () => {
      document.removeEventListener('click', handler);
    };
  }, [ref, onClickOutside, onClickInside]);

  return ref;
}

export function MagicPaletteContainer({
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
      className={'magic-palette-container' + (widescreen ? ' widescreen' : '')}
    >
      {children}
    </div>
  );
}

MagicPaletteContainer.propTypes = {
  onClickOutside: PropTypes.func.isRequired,
  onClickInside: PropTypes.func.isRequired,
  widescreen: PropTypes.bool.isRequired,
};
