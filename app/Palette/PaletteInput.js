import './Palette.css';
import React, { useCallback, useEffect } from 'react';
import { keyName } from 'w3c-keyname';
import PropTypes from 'prop-types';

export const PaletteInput = React.forwardRef(
  (
    { onDismiss, onPressEnter, updateCounter, updateQuery, query, counter },
    inputRef,
  ) => {
    const handleOnInputPromptChange = useCallback(
      (e) => {
        updateQuery(e.target.value);
      },
      [updateQuery],
    );

    const onInputPressKey = (event) => {
      const key = keyName(event);
      if (key === 'Escape') {
        onDismiss();
        event.preventDefault();
        return;
      }

      if (key === 'Enter') {
        onPressEnter({ query, counter });
        event.preventDefault();
        return;
      }

      if (key === 'ArrowDown' || key === 'ArrowUp') {
        const dir = key === 'ArrowUp' ? -1 : 1;
        updateCounter((counter || 0) + dir);
        event.preventDefault();
        return;
      }
    };

    useEffect(() => {
      inputRef.current.focus();
    }, [inputRef]);

    return (
      <div className="flex mb-2 sticky top-0">
        <input
          type="text"
          aria-label="palette-input"
          className="flex-grow px-2"
          ref={inputRef}
          value={query}
          onChange={handleOnInputPromptChange}
          onKeyDown={onInputPressKey}
        />
      </div>
    );
  },
);

PaletteInput.propTypes = {
  onDismiss: PropTypes.func.isRequired,
  onPressEnter: PropTypes.func.isRequired,
  updateCounter: PropTypes.func.isRequired,
  updateQuery: PropTypes.func.isRequired,
  query: PropTypes.string.isRequired,
  counter: PropTypes.number.isRequired,
};

/**
 * Calculate the currently active item
 * @param {*} counter The currently active counter passed to you by this component
 * @param {*} size The total number of elements displayed after applying query
 */
PaletteInput.getActiveIndex = (counter, size) => {
  const r = counter % size;
  return r < 0 ? r + size : r;
};
